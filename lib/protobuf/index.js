'use strict';

var Long     = require('long');
var Protocol = require('../index');
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
    'string'
];

var ProtobufProtocol = Protocol.createProtocol();

function unquote(str) {
    if ((str[0] === '"' && str[str.length - 1] === '"') || (str[0] === '\'' && str[str.length - 1] === '\'')) {
        return str.slice(1, str.length - 1);
    }
    return str;
}

function getFieldWireType(field) {
    if (field.repeated && field.options.packed === 'true') {
        return 2;
    }

    if (field._enum) {
        return 0;
    }

    switch (field.type) {
        case 'int32':
        case 'int64':
        case 'uint32':
        case 'uint64':
        case 'sint32':
        case 'sint64':
        case 'bool':
            return 0;
        case 'fixed64':
        case 'sfixed64':
        case 'double':
            return 1;
        case 'fixed32':
        case 'sfixed32':
        case 'float':
            return 5;
        case 'bytes':
        case 'string':
            return 2;
        default: // embedded message or map
            return 2;
    }
}

module.exports = function createProtobufProtocol(proto, options) {
    var _Protocol = ProtobufProtocol.createProtocol();
    var definitions = {};

    options = _.defaults(options || {}, {
        typeSpecificDefaults: true
    });

    if (!Array.isArray(proto)) {
        proto = [proto];
    }

    function defaultFieldValue(field) {
        var _default = field.options.default;
        if (options.typeSpecificDefaults === false && _default === undefined) {
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

        _Protocol.define(_enum.name, {
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

        _Protocol.define(msg.name, {
            read: function (length) {
                var self = this;

                length = length || self.buffer.length;

                while (self.offset < length) {
                    self._field(undefined, fullName, definitions[fullName]);
                }

                _.each(definitions[fullName], function (field) {
                    var v;
                    if (field.map) { // remap back into js format
                        self.context[field.name] = self.context[field.name].reduce(function (acc, e) {
                            acc[e.key] = e.val; return acc;
                        }, {});
                    }
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

                var oneofs = {};

                _.each(definitions[fullName], function (field) {
                    var _value = value[field.name];

                    if (field.map) { // remap into supported format
                        _value = _.map(_value, function (val, key) { return { key: key, val: val }; });
                    }

                    if (_value === undefined && field.required === true && field.options.default !== undefined) { // use default value for required fields
                        _value = defaultFieldValue(field);
                    }
                    if (field.oneof) {
                        if (oneofs[field.oneof]) {
                            // console.log(field.name, _value, 'ignored');
                            return;
                        }
                        oneofs[field.oneof] = true;
                    }
                    if (_value !== undefined) {
                        self._field(field, _value);
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

    function parseProto(data) {
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

                if (field.type === 'map') { // treat map as repeated map entry message with key/value fields
                    field.type = '#map#field#entry#' + name + '#' + field.name;
                    field.repeated = true;
                    field._embedded = true;

                    defineMessage(undefined, {
                        name: field.type,
                        fields: [{
                            name: 'key',
                            type: field.map.from,
                            tag: 1,
                            oneof: null
                        }, {
                            name: 'val',
                            type: field.map.to,
                            tag: 2,
                            ondeof: null
                        }]
                    });
                    return;
                }

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
    }

    proto.forEach(function (data) {
        if (data) {
            parseProto(data);
        }
    });

    return _Protocol;
};

ProtobufProtocol.define('uint32', {
    read: function () {
        this.UVarint();
    },
    write: function (value) {
        this.UVarint(value);
    }
});

ProtobufProtocol.define('bool', {
    read: function () {
        return Boolean(this.uint32().context);
    },
    write: function (value) {
        this.uint32(Number(!!value));
    }
});

ProtobufProtocol.define('int32', {
    read: function () {
        this.Varint();
    },
    write: function (value) {
        this.Varint(value);
    }
});

ProtobufProtocol.define('sint32', {
    read: function () {
        this.SVarint();
    },
    write: function (value) {
        this.SVarint(value);
    }
});

ProtobufProtocol.define('fixed32', {
    read: function () {
        this.UInt32LE();
    },
    write: function (value) {
        this.UInt32LE(value);
    }
});

ProtobufProtocol.define('float', {
    read: function () {
        this.FloatLE();
    },
    write: function (value) {
        this.FloatLE(value);
    }
});

ProtobufProtocol.define('sfixed32', {
    read: function () {
        this.Int32LE();
    },
    write: function (value) {
        this.Int32LE(value);
    }
});

ProtobufProtocol.define('uint64', {
    read: function () {
        this.UVarint64();
    },
    write: function (value) {
        this.UVarint64(value);
    }
});

ProtobufProtocol.define('int64', {
    read: function () {
        this.Varint64();
    },
    write: function (value) {
        this.Varint64(value);
    }
});

ProtobufProtocol.define('sint64', {
    read: function () {
        this.SVarint64();
    },
    write: function (value) {
        this.SVarint64(value);
    }
});


ProtobufProtocol.define('fixed64', {
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

ProtobufProtocol.define('double', {
    read: function () {
        this.DoubleLE();
    },
    write: function (value) {
        this.DoubleLE(value);
    }
});

ProtobufProtocol.define('sfixed64', {
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

ProtobufProtocol.define('bytes', {
    read: function () {
        this.UVarint('length');
        if (this.context.length <= 0) {
            return null;
        }
        this.raw('value', this.context.length);
        return this.context.value;
    },
    write: function (value) {
        if (value === undefined) {
            return;
        }
        if (value === null) {
            value = new Buffer(0);
        }
        if (typeof value === 'string') {
            value = new Buffer(value, 'utf8');
        }
        if (Buffer.isBuffer(value)) {
            this
                .UVarint(value.length)
                .raw(value);
        } else {
            throw new Error('bytes value should be a Buffer or String');
        }
    }
});

ProtobufProtocol.define('string', {
    read: function () {
        return this.bytes().context.toString('utf8');
    },
    write: function (value) {
        this.bytes(new Buffer(value, 'utf8'));
    }
});

ProtobufProtocol.define('_field', {
    read: function (msgName, fields) {
        var self = this;
        var tag, field, fname, type;

        self.UVarint('meta');

        type = self.context.meta & 0x07;
        tag = self.context.meta >> 3;

        field = fields[tag];

        if (!field) {
            throw new Error('Unknown message tag ' + tag + ' in message ' + msgName);
        }

        fname = [field.name];
        if (field.repeated && field.options.packed !== 'true') { // repeated, not packed
            fname.push(self.context[field.name] ? self.context[field.name].length : 0);
        }
        if (type === 2) {
            self._lengthLimited(fname, field);
        } else {
            _.get(self, field.type).call(self, fname);
        }

        delete self.context.meta;
    },
    write: function (field, value) {
        var self = this;

        var type = getFieldWireType(field);

        if (field.repeated && field.options.packed !== 'true' && Array.isArray(value)) { // repeated, not packed
            value.forEach(function (v) {
                self._field(field, v);
            });
        } else {
            if (type === 2) { // length delimited
                self.UVarint((field.tag << 3) + type);
                self._lengthLimited(field, value);
            } else {
                self.UVarint((field.tag << 3) + type);
                _.get(self, field.type).call(self, value);
            }
        }
    }
});

ProtobufProtocol.define('_lengthLimited', {
    read: function (field) {
        var self = this;
        var len, i;

        if (field.type === 'bytes' || field.type === 'string') {
            self[field.type]();
        } else {
            self.UVarint('length'); // read message length

            if (field.repeated && field.options.packed === 'true') { // repeated, packed
                i = 0;
                len = self.offset + self.context.length;
                while (self.offset < len) {
                    _.get(self, field.type).call(self, ['items', i++]);
                }
                return self.context.items;
            }

            // if (field._embedded) {
            _.get(self, field.type).call(self, undefined, self.offset + self.context.length);
            delete self.context.length;
            // }
        }

        return undefined;
    },
    write: function (field, value) {
        var self = this;
        var _o1, _o2;

        if (field.type === 'bytes' || field.type === 'string') {
            return self[field.type](value);
        }

        _o1 = self.offset;
        self.skip(5); // maximum unsigned varint size
        if (field.repeated && field.options.packed === 'true') { // packed repeated
            value.forEach(function (v) {
                _.get(self, field.type).call(self, v);
            });
        } else {
            _.get(self, field.type).call(self, value);
        }
        _o2 = self.offset;
        self.offset = _o1;
        self.UVarint(_o2 - _o1 - 5); // write length of embedded message
        self.buffer.copy(self.buffer, self.offset, _o1 + 5, _o2); // move message data
        self.offset += _o2 - _o1 - 5;

        return undefined;
    }
});
