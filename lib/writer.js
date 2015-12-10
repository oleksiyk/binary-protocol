"use strict";

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

Writer.prototype.skip = function(bytes) {
    this.offset += bytes;
};


Writer.prototype.loop = function(path, fn, iterations) {
    var _break = false;

    var end = iterations !== undefined ? undefined: function () {
        _break = true;
    };

    while(!_break && (iterations !== undefined ? iterations-- : true)){
        fn.call(this, end);
    }
};

Writer.prototype.reset = function() {
    this.offset = 0;
};

Writer.prototype.result = function() {
    return this.buffer.slice(0, this.offset);
};
