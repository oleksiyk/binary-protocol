'use strict';

var _ = require('lodash');

function Writer(bufferSize) {
    this.buffer = new Buffer(bufferSize || 1024);
    this.offset = 0;
}

module.exports = Writer;

function _write(name, write, value) {
    write.apply(this, [value].concat(Array.prototype.slice.call(arguments, 3)));
    return this;
}

Writer._pdefine = function (name, write) {
    Writer.prototype[name] = _.partial(_write, name, write);
};

Writer.prototype.define = function (name, write, namespace) {
    _.set(this, namespace ? namespace + '.' + name : name, _.bind(_write, this, name, write));
};

Writer.prototype._growBuffer = function (newSize) {
    var _b = new Buffer(newSize);
    this.buffer.copy(_b, 0, 0, this.offset);
    this.buffer = _b;
};

Writer.prototype.demand = function (bytes) {
    if (this.offset + bytes > this.buffer.length) {
        this._growBuffer(_.max([this.offset + bytes, this.buffer.length * 0.25]));
    }
    return this;
};

Writer.prototype.skip = function (bytes) {
    this.offset += bytes;
    return this;
};

Writer.prototype.loop = function (values, fn, iterations) {
    var _break = false, i = 0;

    var end = function () {
        _break = true;
    };

    if (iterations === undefined) {
        iterations = values.length;
    }

    while (!_break && (iterations !== undefined ? iterations-- : true)) {
        fn.call(this, values[i++], end);
    }

    return this;
};

Writer.prototype.reset = function () {
    this.offset = 0;
    return this;
};

/*
Writer.prototype.prepend = function (offset, fn) {
    var _b = new Buffer(this.offset - offset);
    this.buffer.copy(_b, 0, offset, this.offset);
    this.offset = offset;
    fn.apply(this, Array.prototype.slice.call(arguments, 2));
    this.demand(_b.length);
    _b.copy(this.buffer, this.offset, 0);
    this.offset += _b.length;
};
*/

Object.defineProperty(Writer.prototype, 'result', {
    enumerable: true, get: function () {
        return this.buffer.slice(0, this.offset);
    }
});
