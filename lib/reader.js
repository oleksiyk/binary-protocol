"use strict";

var _ = require('lodash');

function Reader (buffer){
    this.buffer = buffer;
    this.offset = 0;
    this.result = {};
    this.path = [];
}

module.exports = Reader;

Reader.define = function (name, read) {
    Reader.prototype[name] = function (path) {
        var _path, context = {}, r;

        if(typeof path !== 'string'){ path = undefined }

        this.path.push(path);

        _path = this.path.join('.');
        _.set(this.result, _path, context);

        r = read.apply(this, [context].concat(Array.prototype.slice.call(arguments, 1)));

        if(r){
            _.set(this.result, _path, r);
        }

        this.path.pop();

        return this;
    };
};

Reader.prototype.skip = function(bytes) {
    this.offset += bytes;
};

Reader.prototype.demand = function(bytes) {
    if(this.offset + bytes > this.buffer.length){
        throw new RangeError('Trying to access beyond buffer length');
    }
};

Reader.prototype.loop = function(path, fn, iterations) {
    var i = 0, _break = false, _path;

    var end = function () {
        _break = true;
    };

    while(!_break && (iterations !== undefined ? iterations-- : true)){
        this.path.push(path + '[' + i++ + ']');
        _path = this.path.join('.');
        fn.call(this, end);
        this.path.pop();
    }
};

