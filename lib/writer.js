"use strict";

var _ = require('lodash');

function Writer (bufferSize){
    this.buffer = new Buffer(bufferSize || 1024);
    this.offset = 0;
}

module.exports = Writer;

Writer.define = function (name, write) {
    Writer.prototype[name] = function (value) {
        write.apply(this, [value].concat(Array.prototype.slice.call(arguments, 1)));
        return this;
    };
};

Writer.prototype._growBuffer = function (newSize) {
    var _b = new Buffer(newSize);
    this.buffer.copy(_b, 0, 0, this.offset);
    this.buffer = _b;
};

Writer.prototype.demand = function(bytes) {
    if(this.offset + bytes > this.buffer.length){
        this._growBuffer(_.max([this.offset + bytes, this.buffer.length * 0.25]));
    }
};

Writer.prototype.skip = function(bytes) {
    this.offset += bytes;
};


Writer.prototype.loop = function(values, fn, iterations) {
    var _break = false, i = 0;

    var end = function () {
        _break = true;
    };

    if(iterations === undefined){
        iterations = values.length;
    }

    while(!_break && (iterations !== undefined ? iterations-- : true)){
        fn.call(this, values[i++], end);
    }
};

Writer.prototype.reset = function() {
    this.offset = 0;
};

Writer.prototype.result = function() {
    return this.buffer.slice(0, this.offset);
};
