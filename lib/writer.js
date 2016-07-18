'use strict';

var _ = require('lodash');

function Writer(options) {
    var self = this;

    self.id = _.uniqueId('writer_');

    self.options = _.defaults(options || {}, {
        bufferSize: 8 * 1024,
        resultCopy: false // set to true if you want write().result to return a copy of the Buffer instead of the slice
    });

    self.buffer = new Buffer(Math.ceil(self.options.bufferSize / 8192) * 8192); // round to 8k blocks
    self.offset = 0;

    if (self.__methods) {
        self.__methods.forEach(function (opts) {
            self.define.apply(self, opts);
        });
    }
}

module.exports = Writer;

function _write(fn) {
    var args = new Array(arguments.length - 1);
    var i;

    for (i = 0; i < args.length; ++i) {
        args[i] = arguments[i + 1];
    }

    fn.apply(this, args);

    return this;
}

Writer.define = function (name, fn, namespace, _proto) {
    _proto = _proto || Writer;

    if (!_proto.prototype.__methods) {
        _proto.prototype.__methods = [];
    }
    _proto.prototype.__methods.push([name, fn, namespace]);
};

Writer.prototype.define = function (name, fn, namespace) {
    _.set(this, namespace ? namespace + '.' + name : name, _.bind(_write, this, fn));
};

Writer.prototype._growBuffer = function (newSize) {
    var _b;

    newSize = Math.ceil(newSize / 8192) * 8192; // round to 8k
    _b = new Buffer(newSize);
    this.buffer.copy(_b, 0, 0, this.offset);
    this.buffer = _b;
};

Writer.prototype.demand = function (bytes) {
    if (this.offset + bytes > this.buffer.length) {
        this._growBuffer(_.max([this.offset + bytes, this.buffer.length * 1.25]));
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
        var copy;
        if (this.options.resultCopy) {
            copy = new Buffer(this.offset);
            this.buffer.copy(copy, 0, 0, this.offset);
            return copy;
        }
        return this.buffer.slice(0, this.offset);
    }
});
