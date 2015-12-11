"use strict";

var Long = require('long');

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
    if(config.read){
        exports.Reader.define(name, config.read);
    }
    if(config.write){
        exports.Writer.define(name, config.write);
    }
};

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

primitives.forEach(function (p) {
    exports.define(p[0], {
        read: function () {
            var r = this.buffer['read' + p[0]](this.offset);
            this.offset += p[1];
            return r;
        },
        write: function (value) {
            this.demand(p[1]);
            var r = this.buffer['write' + p[0]](value, this.offset);
            this.offset += p[1];
            return r;
        }
    });
});

exports.define('raw', {
    read: function (context, bytes) {
        this.demand(bytes);
        var r = new Buffer(bytes);
        this.buffer.copy(r, 0, this.offset, this.offset + bytes);
        this.offset += bytes;
        return r;
    },
    write: function (buffer) {
        if(typeof buffer === 'string' || Array.isArray(buffer)){
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
        var long = Long.fromString(value  + '');
        this.buffer.writeInt32BE(long.getHighBits(), this.offset);
        this.buffer.writeInt32BE(long.getLowBits(), this.offset + 4);
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
        var long = Long.fromString(value  + '');
        this.buffer.writeInt32LE(long.getHighBits(), this.offset + 4);
        this.buffer.writeInt32LE(long.getLowBits(), this.offset);
        this.offset += 8;
    }
});


