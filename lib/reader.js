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
        return _.get(this.result, this.path);
    }, set: function (v) {
        _.set(this.result, this.path, v);
    }
});

function _read(fn, path) {
    var r, i, _path = [];
    var args, len = arguments.length;
    if (typeof path === 'string') {
        _path = [path];
    } else if (Array.isArray(path)) {
        _path = path;
    }

    for (i = 0; i < _path.length; i++) {
        this.path.push(_path[i]);
    }

    if (len > 2) {
        args = new Array(len - 2);
        for (i = 0; i < args.length; ++i) {
            args[i] = arguments[i + 2];
        }
    } else {
        args = [];
    }

    r = fn.apply(this, args);

    if (r !== undefined) {
        if (this.path.length) {
            _.set(this.result, this.path, r);
        } else {
            this.result = r;
        }
    }

    for (i = 0; i < _path.length; i++) {
        this.path.pop();
    }

    return this;
}

Reader.define = function (name, fn, namespace, _proto) {
    _proto = _proto || Reader;

    if (!_proto.prototype.__methods) {
        _proto.prototype.__methods = [];
    }
    _proto.prototype.__methods.push([name, fn, namespace]);
};

Reader.prototype.define = function (name, fn, namespace) {
    _.set(this, namespace ? namespace + '.' + name : name, _.bind(_read, this, fn));
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
        this.path.push(path);
        this.path.push(i++);
        fn.call(this, end);
        this.path.pop();
        this.path.pop();
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
