'use strict';

var Long   = require('long');

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

module.exports = (function () {
    [
        'Reader',
        'Writer'
    ].forEach(function (service) {
        exports[service] = require(__dirname + '/' + service.toLowerCase());
    });

    return exports;
})();

exports.define = function (name, config) {
    if (config.read) {
        exports.Reader.define(name, config.read);
    }
    if (config.write) {
        exports.Writer.define(name, config.write);
    }
};

exports.read = function (buffer) {
    var reader = new exports.Reader(buffer);
    return reader;
};

exports.write = function (size) {
    var writer = new exports.Writer(size);
    return writer;
};

exports.protobuf = function () {
    require('./protobuf');
};

primitives.forEach(function (p) {
    exports.define(p[0], {
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

exports.define('raw', {
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

exports.define('Int64BE', {
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

exports.define('Int64LE', {
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

exports.define('UInt64BE', {
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

exports.define('UInt64LE', {
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

