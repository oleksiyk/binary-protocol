"use strict";

var _ = require('lodash');

function Reader (buffer){
    this.buffer = buffer;
    this.offset = 0;
    this.result = {};
    this.path = [];
}

/*function _del(obj, path) {
    path.reduce(function(el, p, ind, arr) {
        var _r;
        if (/(.+?)\[(\d+)\]/.exec(p)) {
            _r = el[RegExp.$1][RegExp.$2];
            if (ind === arr.length - 1) {
                el[RegExp.$1].pop();
            }
        } else {
            _r = el[p];
            if (ind === arr.length - 1) {
                delete el[p];
            }
        }
        return _r;
    }, obj);
}*/

module.exports = Reader;

Object.defineProperty(Reader.prototype, 'context', {
    enumerable: true, get: function () {
        return _.get(this.result, this.path.join('.'));
    }, set: function (v) {
        _.set(this.result, this.path.join('.'), v);
    }
});

Reader.define = function (name, read) {
    Reader.prototype[name] = function (path) {
        var _path, r;

        if(typeof path !== 'string'){ path = undefined }

        if(path){
            this.path.push(path);
        }

        _path = this.path.join('.');

        try{
            r = read.apply(this, Array.prototype.slice.call(arguments, 1));
        } catch (err) {
            throw err;
        } finally {
            if(path){
                this.path.pop();
            }
        }

        if(r !== undefined){
            _.set(this.result, _path, r);
        }

        return this;
    };
};

Reader.prototype.skip = function(bytes) {
    this.offset += bytes;
    return this;
};

Reader.prototype.demand = function(bytes) {
    if(this.offset + bytes > this.buffer.length){
        throw new RangeError('Trying to access beyond buffer length');
    }
    return this;
};

Reader.prototype.loop = function(path, fn, iterations) {
    var i = 0, _break = false;

    var end = function () {
        _break = true;
    };

    while(!_break && (iterations !== undefined ? iterations-- : true)){
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

