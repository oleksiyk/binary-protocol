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

module.exports = function (protocol) {
    var messageFields = {};

    function defineEnum(namespace, _enum) {
        var fullName = namespace ? namespace + '.' + _enum.name : _enum.name;
        messageFields[fullName] = { _enum: true };

        protocol.define(_enum.name, {
            read: function () {
                this.UVarint();
            }
        }, namespace);
    }

    function defineMessage(namespace, msg) {
        var fullName = namespace ? namespace + '.' + msg.name : msg.name;

        messageFields[fullName] = _.zipObject(_.map(msg.fields, 'tag'), msg.fields);

        protocol.define(msg.name, {
            read: function (_length) {
                var tag, field, fname, type;
                while (this.offset < (_length || this.buffer.length)) {
                    this.UVarint('meta');
                    type = this.context.meta & 0x07;
                    tag = this.context.meta >> 3;
                    field = messageFields[fullName][tag];
                    if (!field) {
                        throw new Error('Unknown message tag ' + tag + ' in message ' + fullName);
                    }
                    fname = field.name;
                    if (field.repeated) {
                        fname += '[' + (this.context[field.name] ? this.context[field.name].length : 0) + ']';
                    }
                    if (field._embedded && type === 2) {
                        this.UVarint('length'); // read embedded message length
                    }
                    _.get(this, field.type)(fname, this.offset + this.context.length);
                    delete this.context.meta;
                    delete this.context.length;
                }
            },
            write: function (value) {
                _.each(msg.fields, function (field) {
                    if (typeof value[field.name] !== undefined) {
                        switch (field.type) {
                            case 'int32':
                            case 'uint32':
                            case 'sint32':
                            case 'bool':
                            case 'int64':
                            case 'uint64':
                            case 'sint64':
                                this.UVarint(field.tag << 3);
                                break;
                            case 'fixed64':
                            case 'sfixed64':
                            case 'double':
                                this.UVarint((field.tag << 3) + 1);
                                break;
                            case 'fixed32':
                            case 'sfixed32':
                            case 'float':
                                this.UVarint((field.tag << 3) + 5);
                                break;
                            case 'bytes':
                            case 'string':
                                this.UVarint((field.tag << 3) + 2);
                                break;
                            default:
                                // if enum
                                // this.UVarint(field.tag << 3);
                                // else
                                this.UVarint((field.tag << 3) + 2);
                        }
                        _.get(this, field.type)(value[field.name]);
                    } else if (field.required === true) {
                        throw new Error(msg.name + ': ' + 'field ' + field.name + ' is required');
                    }
                });
            }
        }, namespace);

        _.each(msg.messages, function (_msg) {
            defineMessage(namespace + '.' + msg.name, _msg);
        });

        _.each(msg.enums, function (_enum) {
            defineEnum(namespace + '.' + msg.name, _enum);
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
        _.each(messageFields, function (fields, name) {
            if (fields._enum) {return;}
            _.each(fields, function (field) {
                var paths;
                if (!_.includes(primitives, field.type)) {
                    field._embedded = true; // these are embedded messages, preceded by length varint
                    paths = _.reduce(name.split('.'), function (acc, val, ind, col) {
                        acc.push(col.slice(0, col.length - ind).join('.') + '.' + field.type);
                        return acc;
                    }, []);
                    field.type = _.find(paths, function (p) {
                        return !_.isUndefined(messageFields[p]);
                    });
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
