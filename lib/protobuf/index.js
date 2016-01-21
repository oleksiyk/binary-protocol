'use strict';

var protocol = require('../index');
var varint   = require('./varint');
var Long     = require('long');

protocol.define('pb_field', {
    read: function () {
        var v = varint.read(this.buffer, this.offset);
        this.offset += v.length;
        return {
            type: v.value & 0x07,
            tag: v.value >> 3
        };
    },
    write: function (field) {
        switch (field.type) {
            case 'int32':
            case 'uint32':
            case 'sint32':
            case 'bool':
            case 'int64':
            case 'uint64':
            case 'sint64':
                this.uvarint(field.tag << 3);
                break;
            case 'fixed64':
            case 'sfixed64':
            case 'double':
                this.uvarint((field.tag << 3) + 1);
                break;
            case 'fixed32':
            case 'sfixed32':
            case 'float':
                this.uvarint((field.tag << 3) + 5);
                break;
            case 'bytes':
            case 'string':
                this.uvarint((field.tag << 3) + 2);
                break;
            default:
                // if enum
                // this.offset += varint.write(this.buffer, field.tag << 3, this.offset);
                // else
                this.uvarint((field.tag << 3) + 2);
        }
        this['pb_' + field.type](field.value);
    }
});

protocol.define('uvarint', {
    read: function () {
        var v = varint.read(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.offset += varint.write(this.buffer, value, this.offset);
    }
});

protocol.define('varint', {
    read: function () {
        var v = varint.read(this.buffer, this.offset, true);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.offset += varint.write(this.buffer, value, this.offset);
    }
});

protocol.define('uvarint64', {
    read: function () {
        var v = varint.read64(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.offset += varint.write64(this.buffer, value, this.offset);
    }
});

protocol.define('varint64', {
    read: function () {
        var v = varint.read64(this.buffer, this.offset, true);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.offset += varint.write64(this.buffer, value, this.offset);
    }
});

protocol.define('pb_uint32', {
    read: function () {
        this.uvarint('value');
        return this.context.value;
    },
    write: function (value) {
        this.uvarint(value);
    }
});

protocol.define('pb_bool', {
    read: function () {
        this.pb_uint32();
        return Boolean(this.context);
    },
    write: function (value) {
        this.pb_uint32(Number(!!value));
    }
});

protocol.define('pb_int32', {
    read: function () {
        this.varint('value');
        return this.context.value;
    },
    write: function (value) {
        if (value < 0) {
            this.pb_uint64(value);
        } else {
            this.pb_uint32(value);
        }
    }
});

protocol.define('pb_sint32', {
    read: function () {
        this.pb_int32();
        return varint.dezigzag(this.context);
    },
    write: function (value) {
        this.pb_uint32(varint.zigzag(value));
    }
});

protocol.define('pb_fixed32', {
    read: function () {
        this.UInt32LE();
        return this.context;
    },
    write: function (value) {
        this.UInt32LE(value);
    }
});

protocol.define('pb_float', {
    read: function () {
        this.FloatLE();
        return this.context;
    },
    write: function (value) {
        this.FloatLE(value);
    }
});

protocol.define('pb_sfixed32', {
    read: function () {
        this.Int32LE();
        return this.context;
    },
    write: function (value) {
        this.Int32LE(value);
    }
});

protocol.define('pb_uint64', {
    read: function () {
        this.uvarint64('value');
        return this.context.value;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.uvarint64(value);
    }
});

protocol.define('pb_int64', {
    read: function () {
        this.varint64('value');
        return this.context.value;
    },
    write: function (value) {
        this.pb_uint64(value);
    }
});

protocol.define('pb_sint64', {
    read: function () {
        this.pb_int64();
        return varint.dezigzag64(this.context);
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.pb_uint64(varint.zigzag64(value));
    }
});


protocol.define('pb_fixed64', {
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

protocol.define('pb_double', {
    read: function () {
        this.DoubleLE();
        return this.context;
    },
    write: function (value) {
        this.DoubleLE(value);
    }
});

protocol.define('pb_sfixed64', {
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

protocol.define('pb_bytes', {
    read: function () {
        this.uvarint('length');
        if (this.context.length <= 0) {
            return null;
        }
        this.raw('value', this.context.length);
        return this.context.value;
    },
    write: function (value) {
        if (value === undefined || value === null) {
            this.uvarint(0);
            return;
        }
        if (Buffer.isBuffer(value) || typeof value === 'string') {
            this
                .uvarint(value.length)
                .raw(value);
        } else {
            throw new Error('bytes value should be a Buffer or String');
        }
    }
});

protocol.define('pb_string', {
    read: function () {
        this.pb_bytes('value');
        return this.context.value.toString('utf8');
    },
    write: function (value) {
        this.pb_bytes(value);
    }
});
