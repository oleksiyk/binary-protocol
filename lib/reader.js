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
        var _path, context = {};

        if(this.break){
            return;
        }

        this.path.push(path);

        _path = this.path.join('.');
        _.set(this.result, _path, context);

        var r = read.apply(this, [context].concat(Array.prototype.slice.call(arguments, 1)));
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


Reader.prototype.loop = function(path, fn, iterations) {
    var i = 0, _break = false, _path;

    var end = iterations !== undefined ? undefined: function () {
        _break = true;
    };

    while(!_break && (iterations !== undefined ? iterations-- : true)){
        this.path.push(path + '[' + i++ + ']');
        _path = this.path.join('.');
        fn.call(this, end);
        this.path.pop();
    }
};

