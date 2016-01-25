'use strict';

var Long   = require('long');
var varint = require('./protobuf/varint');
var Reader = require('./reader');
var Writer = require('./writer');
var _      = require('lodash');

var primitives = [
    ['Int8', 1],
    ['UInt8', 1],
    ['Int16LE', 2],
    ['UInt16LE', 2],
    ['Int16BE', 2],
    ['UInt16BE', 2],
    ['Int32LE', 4],
    ['Int32BE', 4],
    ['UInt32LE', 4],
    ['UInt32BE', 4],
    ['FloatLE', 4],
    ['FloatBE', 4],
    ['DoubleLE', 8],
    ['DoubleBE', 8]
];

function Protocol(options) {
    options = _.defaults(options || {}, {
        writerBufSize: 1024
    });

    this.reader = new Reader();
    this.writer = new Writer(options.writerBufSize);

    if (options.protobuf) {
        require('./protobuf')(this);
    }
}

module.exports = Protocol;

Protocol.prototype.define = function (name, config) {
    if (config.read) {
        this.reader.define(name, config.read);
    }
    if (config.write) {
        this.writer.define(name, config.write);
    }
};

Protocol.prototype.read = function (buffer) {
    return this.reader.reset(buffer);
};

Protocol.prototype.write = function () {
    return this.writer.reset();
};

Protocol._pdefine = function (name, config) {
    Reader._pdefine(name, config.read);
    Writer._pdefine(name, config.write);
};

primitives.forEach(function (p) {
    Protocol._pdefine(p[0], {
        read: function () {
            var r = this.buffer['read' + p[0]](this.offset);
            this.offset += p[1];
            return r;
        },
        write: function (value) {
            var r;
            this.demand(p[1]);
            r = this.buffer['write' + p[0]](value, this.offset);
            this.offset += p[1];
            return r;
        }
    });
});

Protocol._pdefine('raw', {
    read: function (bytes) {
        var r;
        this.demand(bytes);
        r = new Buffer(bytes);
        this.buffer.copy(r, 0, this.offset, this.offset + bytes);
        this.offset += bytes;
        return r;
    },
    write: function (buffer) {
        if (typeof buffer === 'string' || Array.isArray(buffer)) {
            buffer = new Buffer(buffer);
        }
        this.demand(buffer.length);
        buffer.copy(this.buffer, this.offset, 0);
        this.offset += buffer.length;
    }
});

Protocol._pdefine('Int64BE', {
    read: function () {
        var l = new Long(this.buffer.readInt32BE(this.offset + 4), this.buffer.readInt32BE(this.offset));
        this.offset += 8;
        return l;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.buffer.writeInt32BE(value.getHighBits(), this.offset);
        this.buffer.writeInt32BE(value.getLowBits(), this.offset + 4);
        this.offset += 8;
    }
});

Protocol._pdefine('Int64LE', {
    read: function () {
        var l = new Long(this.buffer.readInt32LE(this.offset), this.buffer.readInt32LE(this.offset + 4));
        this.offset += 8;
        return l;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.buffer.writeInt32LE(value.getHighBits(), this.offset + 4);
        this.buffer.writeInt32LE(value.getLowBits(), this.offset);
        this.offset += 8;
    }
});

Protocol._pdefine('UInt64BE', {
    read: function () {
        var l = new Long(this.buffer.readUInt32BE(this.offset + 4), this.buffer.readUInt32BE(this.offset), true);
        this.offset += 8;
        return l;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.buffer.writeUInt32BE(value.getHighBitsUnsigned(), this.offset);
        this.buffer.writeUInt32BE(value.getLowBitsUnsigned(), this.offset + 4);
        this.offset += 8;
    }
});

Protocol._pdefine('UInt64LE', {
    read: function () {
        var l = new Long(this.buffer.readUInt32LE(this.offset), this.buffer.readUInt32LE(this.offset + 4), true);
        this.offset += 8;
        return l;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.buffer.writeUInt32LE(value.getHighBitsUnsigned(), this.offset + 4);
        this.buffer.writeUInt32LE(value.getLowBitsUnsigned(), this.offset);
        this.offset += 8;
    }
});

// unsigned varint
Protocol._pdefine('UVarint', {
    read: function () {
        var v = varint.read(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.offset += varint.write(this.buffer, value, this.offset);
    }
});

// normal signed varint
Protocol._pdefine('Varint', {
    read: function () {
        this.UVarint('value');
        return this.context.value | 0;
    },
    // should be 10 bytes long
    // https://developers.google.com/protocol-buffers/docs/encoding?hl=en#signed-integers
    // Quote: "If you use int32 or int64 as the type for a negative number, the resulting varint is always ten bytes long – it is,
    // effectively, treated like a very large unsigned integer.
    // If you use one of the signed types, the resulting varint uses ZigZag encoding, which is much more efficient."
    write: function (value) {
        if (value < 0) {
            this.UVarint64(value);
        } else {
            this.UVarint(value);
        }
    }
});

// zigzag encoded signed varint
Protocol._pdefine('SVarint', {
    read: function () {
        this.UVarint('value');
        return varint.dezigzag(this.context.value);
    },
    write: function (value) {
        this.UVarint(varint.zigzag(value));
    }
});

// unsigned varint 64 bit
Protocol._pdefine('UVarint64', {
    read: function () {
        var v = varint.read64(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.offset += varint.write64(this.buffer, value, this.offset);
    }
});

// normal signed varint 64 bit
Protocol._pdefine('Varint64', {
    read: function () {
        this.UVarint64('value');
        return this.context.value.toSigned();
    },
    write: function (value) {
        this.UVarint64(value);
    }
});

// zigzag encoded signed varint 64
Protocol._pdefine('SVarint64', {
    read: function () {
        this.UVarint64('value');
        return varint.dezigzag64(this.context.value);
    },
    write: function (value) {
        value = Long.fromValue(value);
        this.UVarint64(varint.zigzag64(value));
    }
});
