"use strict";

module.exports = (function () {

    [
        'Reader',
        // 'Writer'
    ].forEach(function (service) {
        exports[service] = require(__dirname + '/' + service.toLowerCase());
    });

    return exports;
})();

exports.define = function (name, config) {
    exports.Reader.define(name, config.read);
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
        }
    });
});

exports.define('raw', {
    read: function (context, bytes) {
        if(this.offset + bytes > this.buffer.length){
            throw new RangeError('Trying to access beyond buffer length');
        }
        var r = new Buffer(bytes);
        this.buffer.copy(r, 0, this.offset, this.offset + bytes);
        this.offset += bytes;
        return r;
    }
});
