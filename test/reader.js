"use strict";

/* global expect, before, describe, it */

var protocol = require('../lib/index');

describe('Reader', function() {

    describe('primitives', function() {
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
            it('should read ' + p[0], function () {
                var reader, buffer = new Buffer(2 * p[1]), num1, num2;
                if(p[0].indexOf('U') !== 0){ // signed
                    num1 = -123; num2 = 123;
                } else { // unsigned
                    num1 = 123; num2 = 123;
                }
                buffer['write' + p[0]](num1, 0);
                buffer['write' + p[0]](num2, p[1]);

                reader = new protocol.Reader(buffer);
                reader[p[0]]('num1')[p[0]]('num2').result.should.be.eql({
                    num1: num1,
                    num2: num2
                });
            });
        });

        it('should read raw bytes', function () {
            var reader, buffer = new Buffer('abcde');

            reader = new protocol.Reader(buffer);
            reader.raw('bytes', 5).result.bytes.toString('utf8').should.be.eql('abcde');
        });
    });

    describe('nested objects and arrays', function () {
        var reader, buffer = new Buffer(16);

        before(function () {
            buffer.writeInt32BE(3, 0);
            buffer.writeInt32BE(2, 4);
            buffer.writeInt32BE(3, 8);
            buffer.writeInt32BE(4, 12);
        });

        it('should create nested result object', function () {
            protocol.define('nested', {
                read: function () {
                    this
                        .Int32BE('a1')
                        .Int32BE('a2')
                        .Int32BE('a3');
                }
            });

            reader = new protocol.Reader(buffer);
            reader.Int32BE('a0').nested('nested').result.should.be.eql({
                a0: 3,
                nested: {
                    a1: 2,
                    a2: 3,
                    a3: 4
                }
            });
        });

        it('should allow custom array results', function () {
            protocol.define('customArray', {
                read: function () {
                    var i = 0;
                    this
                        .Int32BE('length');

                    for(i = 0; i<this.context.length; i++){
                        this.Int32BE('items[' + i + ']');
                    }

                    return this.context.items;
                }
            });

            reader = new protocol.Reader(buffer);
            reader.customArray('items').result.should.be.eql({
                items: [ 2, 3, 4 ]
            });
        });

        it('should build arrays with loop() method', function () {
            protocol.define('loopArray', {
                read: function () {
                    this
                        .Int32BE('length')
                        .loop('items', this.Int32BE, this.context.length);
                    return this.context.items;
                }
            });

            reader = new protocol.Reader(buffer);
            reader.loopArray('items').result.should.be.eql({
                items: [ 2, 3, 4 ]
            });
        });

        it('loop() should stop when end() is called', function () {
            protocol.define('loopArrayEnd', {
                read: function () {
                    var i = 0;
                    this
                        .Int32BE('length')
                        .loop('items', function (end) {
                            this.Int32BE();
                            if(i++ === 2){
                                end();
                            }
                        });
                    return this.context.items;
                }
            });

            reader = new protocol.Reader(buffer);
            reader.loopArrayEnd('items').result.should.be.eql({
                items: [ 2, 3, 4 ]
            });
        });
    });

    it('primitive method should throw RangeError when trying to read beyond buffer length', function () {
        var reader, buffer = new Buffer('abcde');

        reader = new protocol.Reader(buffer);
        expect(function () {
            reader.loop('chars', reader.Int8, 6);
        }).to.throw(RangeError);
    });

    it('raw() should throw RangeError when trying to read beyond buffer length', function () {
        var reader, buffer = new Buffer('abcde');

        reader = new protocol.Reader(buffer);
        expect(function () {
            reader.raw('chars', 6);
        }).to.throw(RangeError);
    });

    it('methods should be chainable', function () {
        var reader, buffer = new Buffer('abcde');

        protocol.define('char', {
            read: function () {
                this.Int8('char');
                return String.fromCharCode(this.context.char);
            }
        });

        reader = new protocol.Reader(buffer);
        reader.skip(1).demand(1).loop('chars', reader.char, 4).result.should.be.eql({chars: ['b', 'c', 'd', 'e']});
    });

});
