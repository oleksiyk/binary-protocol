'use strict';

var Long     = require('long');
// var Protocol = require('../index');
var pbschema = require('protocol-buffers-schema');
var _        = require('lodash');

var primitives = [
    'int32',
    'uint32',
    'sint32',
    'bool',
    'int64',
    'uint64',
    'sint64',
    'fixed64',
    'sfixed64',
    'double',
    'fixed32',
    'sfixed32',
    'float',
    'bytes',
    'string',
];

function unquote(str) {
    if ((str[0] === '"' && str[str.length - 1] === '"') || (str[0] === '\'' && str[str.length - 1] === '\'')) {
        return str.slice(1, str.length - 1);
    }
    return str;
}

module.exports = function (protocol, pbOptions) {
    var definitions = {};

    pbOptions = _.defaultsDeep(pbOptions, {
        typeSpecificDefaults: true
    });

    function defaultFieldValue(field) {
        var _default = field.options.default;
        if (pbOptions.typeSpecificDefaults === false && _default === undefined) {
            return undefined;
        }
        if (field.repeated) {
            return [];
        }
        switch (field.type) {
            case 'int32':
            case 'uint32':
            case 'sint32':
            case 'double':
            case 'fixed32':
            case 'sfixed32':
            case 'float':
                return _default !== undefined ? Number(_default) : 0;
            case 'uint64':
            case 'fixed64':
                return _default !== undefined ? Long.fromString(_default, true) : Long.UZERO;
            case 'int64':
            case 'sint64':
            case 'sfixed64':
                return _default !== undefined ? Long.fromString(_default) : Long.ZERO;
            case 'bool':
                return _default !== undefined ? _default === 'true' : false;
            case 'bytes':
                return _default !== undefined ? new Buffer(unquote(_default), 'base64') : new Buffer(0);
            case 'string':
                return _default !== undefined ? unquote(_default) : '';
            default:
                if (field._enum) {
                    if (_default === undefined) { // get the first enum value as default
                        _default = _.keys(_.get(definitions, [field.type, 'values']))[0];
                    }
                    return _.get(definitions, [field.type, 'values', _default, 'value'], undefined);
                }
                return null;
        }
    }

    function defineEnum(namespace, _enum) {
        var fullName = namespace ? namespace + '.' + _enum.name : _enum.name;

        definitions[fullName] = _enum; _enum._enum = true;

        protocol.define(_enum.name, {
            read: function () {
                this.UVarint();
            },
            write: function (value) {
                this.UVarint(value);
            }
        }, namespace);
    }

    function defineMessage(namespace, msg) {
        var fullName = namespace ? namespace + '.' + msg.name : msg.name;

        definitions[fullName] = _.zipObject(_.map(msg.fields, 'tag'), msg.fields);

        protocol.define(msg.name, {
            read: function (_length) {
                var self = this;

                (function decode() {
                    var tag, field, fname, type;
                    while (self.offset < (_length || self.buffer.length)) {
                        self.UVarint('meta');
                        type = self.context.meta & 0x07;
                        tag = self.context.meta >> 3;
                        field = definitions[fullName][tag];
                        if (!field) {
                            throw new Error('Unknown message tag ' + tag + ' in message ' + fullName);
                        }
                        fname = field.name;
                        if (field.repeated) {
                            fname += '[' + (self.context[field.name] ? self.context[field.name].length : 0) + ']';
                        }
                        if (field._embedded && type === 2) {
                            self.UVarint('length'); // read embedded message length
                        }
                        _.get(self, field.type)(fname, self.offset + self.context.length);
                        delete self.context.meta;
                        delete self.context.length;
                    }
                })();

                _.each(definitions[fullName], function (field) {
                    var v;
                    if (self.context[field.name] === undefined && field.required === true && field.options.default === undefined) {
                        throw new Error('Missing required field ' + fullName + ':' + field.name);
                    }
                    if (self.context[field.name] === undefined) {
                        v = defaultFieldValue(field);
                        if (v !== undefined) {
                            self.context[field.name] = v;
                        }
                    }
                });
            },
            write: function (value) {
                var self = this;
                function encode(field, _value) {
                    var _o1, _o2;
                    switch (field.type) {
                        case 'int32':
                        case 'int64':
                        case 'uint32':
                        case 'uint64':
                        case 'sint32':
                        case 'sint64':
                        case 'bool':
                            // wire type 0
                            self.UVarint(field.tag << 3);
                            break;
                        case 'fixed64':
                        case 'sfixed64':
                        case 'double':
                            // wire type 1
                            self.UVarint((field.tag << 3) + 1);
                            break;
                        case 'fixed32':
                        case 'sfixed32':
                        case 'float':
                            // wire type 5
                            self.UVarint((field.tag << 3) + 5);
                            break;
                        case 'bytes':
                        case 'string':
                            // wire type 2
                            self.UVarint((field.tag << 3) + 2);
                            break;
                        default:
                            if (field._enum) { // wire type 0
                                self.UVarint(field.tag << 3);
                            } else { // embedded messages, packed repeated fields, wire type 2
                                self.UVarint((field.tag << 3) + 2);
                            }
                    }
                    if (field._embedded) {
                        // some hacky code...
                        _o1 = self.offset;
                        self.skip(5); // maximum unsigned varint size
                        _.get(self, field.type)(_value);
                        _o2 = self.offset;
                        self.offset = _o1;
                        self.UVarint(_o2 - _o1 - 5); // write length of embedded message
                        self.buffer.copy(self.buffer, self.offset, _o1 + 5, _o2); // move message data
                        self.offset += _o2 - _o1 - 5;
                    } else {
                        _.get(self, field.type)(_value);
                    }
                }

                _.each(definitions[fullName], function (field) {
                    var fvalue = value[field.name];
                    if (fvalue === undefined && field.required === true && field.options.default !== undefined) { // pack default value for required fields
                        fvalue = defaultFieldValue(field);
                    }
                    if (fvalue !== undefined) {
                        if (field.repeated && Array.isArray(fvalue)) {
                            fvalue.forEach(function (v) {
                                encode(field, v);
                            });
                        } else {
                            encode(field, fvalue);
                        }
                    } else if (field.required === true) {
                        throw new Error('Missing required field ' + fullName + ':' + field.name);
                    }
                });
            }
        }, namespace);

        _.each(msg.messages, function (_msg) {
            defineMessage(namespace ? (namespace + '.' + msg.name) : msg.name, _msg);
        });

        _.each(msg.enums, function (_enum) {
            defineEnum(namespace ? (namespace + '.' + msg.name) : msg.name, _enum);
        });
    }

    protocol.parseProto = function (data) {
        var schema = pbschema.parse(data);

        _.each(schema.messages, function (msg) {
            defineMessage(schema.package, msg);
        });

        _.each(schema.enums, function (_enum) {
            defineEnum(schema.package, _enum);
        });

        // resolve field types
        _.each(definitions, function (fields, name) {
            if (fields._enum) {return;}
            _.each(fields, function (field) {
                var paths;
                if (!_.includes(primitives, field.type)) {
                    paths = _.reduce(('.' + name).split('.'), function (acc, val, ind, col) {
                        acc.push(col.slice(1, col.length - ind).concat(field.type).join('.'));
                        return acc;
                    }, []);
                    field.type = _.find(paths, function (p) {
                        return !_.isUndefined(definitions[p]);
                    });
                    if (definitions[field.type]._enum) {
                        field._enum = true;
                    } else {
                        field._embedded = true; // these are embedded messages, preceded by length varint
                    }
                    // console.log('field', field.name, 'resolved to', field.type);
                }
            });
        });
    };

    protocol.define('uint32', {
        read: function () {
            this.UVarint();
        },
        write: function (value) {
            this.UVarint(value);
        }
    });

    protocol.define('bool', {
        read: function () {
            return Boolean(this.uint32().context);
        },
        write: function (value) {
            this.uint32(Number(!!value));
        }
    });

    protocol.define('int32', {
        read: function () {
            this.Varint();
        },
        write: function (value) {
            this.Varint(value);
        }
    });

    protocol.define('sint32', {
        read: function () {
            this.SVarint();
        },
        write: function (value) {
            this.SVarint(value);
        }
    });

    protocol.define('fixed32', {
        read: function () {
            this.UInt32LE();
        },
        write: function (value) {
            this.UInt32LE(value);
        }
    });

    protocol.define('float', {
        read: function () {
            this.FloatLE();
        },
        write: function (value) {
            this.FloatLE(value);
        }
    });

    protocol.define('sfixed32', {
        read: function () {
            this.Int32LE();
        },
        write: function (value) {
            this.Int32LE(value);
        }
    });

    protocol.define('uint64', {
        read: function () {
            this.UVarint64();
        },
        write: function (value) {
            this.UVarint64(value);
        }
    });

    protocol.define('int64', {
        read: function () {
            this.Varint64();
        },
        write: function (value) {
            this.Varint64(value);
        }
    });

    protocol.define('sint64', {
        read: function () {
            this.SVarint64();
        },
        write: function (value) {
            this.SVarint64(value);
        }
    });


    protocol.define('fixed64', {
        read: function () {
            var l = new Long(this.buffer.readUInt32LE(this.offset), this.buffer.readUInt32LE(this.offset + 4), true);
            this.offset += 8;
            return l;
        },
        write: function (value) {
            value = Long.fromValue(value);
            this.buffer.writeUInt32LE(value.getLowBitsUnsigned(), this.offset);
            this.buffer.writeUInt32LE(value.getHighBitsUnsigned(), this.offset + 4);
            this.offset += 8;
        }
    });

    protocol.define('double', {
        read: function () {
            this.DoubleLE();
        },
        write: function (value) {
            this.DoubleLE(value);
        }
    });

    protocol.define('sfixed64', {
        read: function () {
            var l = new Long(this.buffer.readInt32LE(this.offset), this.buffer.readInt32LE(this.offset + 4));
            this.offset += 8;
            return l;
        },
        write: function (value) {
            value = Long.fromValue(value);
            this.buffer.writeInt32LE(value.getLowBits(), this.offset);
            this.buffer.writeInt32LE(value.getHighBits(), this.offset + 4);
            this.offset += 8;
        }
    });

    protocol.define('bytes', {
        read: function () {
            this.UVarint('length');
            if (this.context.length <= 0) {
                return null;
            }
            this.raw('value', this.context.length);
            return this.context.value;
        },
        write: function (value) {
            if (value === undefined || value === null) {
                return;
            }
            if (Buffer.isBuffer(value) || typeof value === 'string') {
                this
                    .UVarint(value.length)
                    .raw(value);
            } else {
                throw new Error('bytes value should be a Buffer or String');
            }
        }
    });

    protocol.define('string', {
        read: function () {
            return this.bytes().context.toString('utf8');
        },
        write: function (value) {
            this.bytes(new Buffer(value, 'utf8'));
        }
    });
};
