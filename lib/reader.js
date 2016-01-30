'use strict';

var _ = require('lodash');

function Reader(buffer) {
    var self = this;
    self.reset(buffer);

    if (self.__methods) {
        self.__methods.forEach(function (opts) {
            self.define.apply(self, opts);
        });
    }
}

module.exports = Reader;

Object.defineProperty(Reader.prototype, 'context', {
    enumerable: true, get: function () {
        if (this.path.length === 0) {
            return this.result;
        }
        return _.get(this.result, this.path.join('.'));
    }, set: function (v) {
        _.set(this.result, this.path.join('.'), v);
    }
});

function _read(name, read, path) {
    var _path, r;

    if (typeof path !== 'string') { path = undefined; }

    if (path) {
        this.path.push(path);
    }

    _path = this.path.join('.');

    try {
        r = read.apply(this, Array.prototype.slice.call(arguments, 3));
    } catch (err) {
        throw err;
    } finally {
        if (path) {
            this.path.pop();
        }
    }

    if (r !== undefined) {
        if (_path) {
            _.set(this.result, _path, r);
        } else {
            this.result = r;
        }
    }

    return this;
}

Reader.define = function (name, read, namespace, _proto) {
    _proto = _proto || Reader;

    if (!_proto.prototype.__methods) {
        _proto.prototype.__methods = [];
    }
    _proto.prototype.__methods.push([name, read, namespace]);
};

Reader.prototype.define = function (name, read, namespace) {
    _.set(this, namespace ? namespace + '.' + name : name, _.bind(_read, this, name, read));
};

Reader.prototype.skip = function (bytes) {
    this.offset += bytes;
    return this;
};

Reader.prototype.demand = function (bytes) {
    if (this.offset + bytes > this.buffer.length) {
        throw new RangeError('Trying to access beyond buffer length');
    }
    return this;
};

Reader.prototype.loop = function (path, fn, iterations) {
    var i = 0, _break = false;

    var end = function () {
        _break = true;
    };

    while (!_break && (iterations !== undefined ? iterations-- : true)) {
        this.path.push(path + '[' + i++ + ']');
        try {
            fn.call(this, end);
        } catch (err) {
            throw err;
        } finally {
            this.path.pop();
        }
    }
    return this;
};

Reader.prototype.reset = function (buffer) {
    this.buffer = buffer;
    this.offset = 0;
    this.result = {};
    this.path = [];

    return this;
};
