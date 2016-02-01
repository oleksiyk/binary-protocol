'use strict';

/* global describe, it */

var Protocol = require('../lib/index');
var Long     = require('long');

describe('Writer', function () {
    describe('primitives', function () {
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
            it('should write ' + p[0], function () {
                var protocol = new Protocol();
                var buffer = new Buffer(2 * p[1]), num1, num2;
                if (p[0].indexOf('U') !== 0) { // signed
                    num1 = -123; num2 = 123;
                } else { // unsigned
                    num1 = 123; num2 = 123;
                }
                buffer['write' + p[0]](num1, 0);
                buffer['write' + p[0]](num2, p[1]);

                protocol.write()[p[0]](num1)[p[0]](num2).result.should.be.eql(buffer);
            });
        });

        it('should write raw bytes from buffer', function () {
            var protocol = new Protocol();
            var buffer = new Buffer([1, 2, 3, 4]);

            protocol.write().raw(buffer).result.should.be.eql(buffer);
        });

        it('should write raw bytes from string', function () {
            var protocol = new Protocol();
            var string = 'abcde';

            protocol.write().raw(string).result.toString('utf8').should.be.eql(string);
        });

        it('should write raw bytes from utf8 string', function () {
            var protocol = new Protocol();
            var string = '人人生而自由，在尊嚴和權利上一律平等。';
            protocol.write().raw(string).result.toString('utf8').should.be.eql(string);
        });

        it('should write raw bytes from array of octets', function () {
            var protocol = new Protocol();
            var array = [1, 2, 3, 4];
            protocol.write().raw(array).result.should.be.eql(new Buffer(array));
        });
    });

    describe('64 bits', function () {
        var slong = new Long(0xFFFFFFFF, 0x7FFFFFFF),
            ulong = new Long(0xFFFFFFFF, 0x7FFFFFFF, true),
            MAX_NUM = 9007199254740991, MIN_NUM = -9007199254740991;

        it('Int64BE', function () {
            var protocol = new Protocol();
            protocol.write().Int64BE(slong).result.should.be.eql(new Buffer([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]));
        });

        it('Int64BE from number', function () {
            var protocol = new Protocol();
            protocol.write().Int64BE(MIN_NUM).result.should.be.eql(new Buffer([0XFF, 0XE0, 0X00, 0X00, 0X00, 0X00, 0X00, 0X01]));
        });

        it('Int64LE', function () {
            var protocol = new Protocol();
            protocol.write().Int64LE(slong).result.should.be.eql(new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]));
        });

        it('Int64LE from number', function () {
            var protocol = new Protocol();
            protocol.write().Int64LE(MIN_NUM).result.should.be.eql(new Buffer([0X01, 0X00, 0X00, 0X00, 0X00, 0X00, 0XE0, 0XFF]));
        });

        it('UInt64BE', function () {
            var protocol = new Protocol();
            protocol.write().UInt64BE(ulong).result.should.be.eql(new Buffer([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]));
        });

        it('UInt64BE from number', function () {
            var protocol = new Protocol();
            protocol.write().UInt64BE(MAX_NUM).result.should.be.eql(new Buffer([0X00, 0X1F, 0XFF, 0XFF, 0XFF, 0XFF, 0XFF, 0XFF]));
        });

        it('UInt64LE', function () {
            var protocol = new Protocol();
            protocol.write().UInt64LE(ulong).result.should.be.eql(new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]));
        });

        it('UInt64LE from number', function () {
            var protocol = new Protocol();
            protocol.write().UInt64LE(MAX_NUM).result.should.be.eql(new Buffer([0XFF, 0XFF, 0XFF, 0XFF, 0XFF, 0XFF, 0X1F, 0X00]));
        });
    });

    describe('arrays (loop)', function () {
        it('should write custom array', function () {
            var protocol = new Protocol();
            protocol.define('customArray', {
                write: function (values) {
                    var i = 0;
                    this
                        .Int32BE(values.length);

                    for (i = 0; i < values.length; i++) {
                        this.Int32BE(values[i]);
                    }
                }
            });

            protocol.write().customArray([2, 3, 4]).result.should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4]));
        });

        it('should write arrays with loop() method', function () {
            var protocol = new Protocol();
            protocol.define('loopArray', {
                write: function (values) {
                    this
                        .Int32BE(values.length)
                        .loop(values, this.Int32BE);
                }
            });

            protocol.write().loopArray([2, 3, 4]).result.should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4]));
        });

        it('loop should honour iterations argument', function () {
            var protocol = new Protocol();
            protocol.define('loopArrayIterations', {
                write: function (values) {
                    this
                        .Int32BE(values.length)
                        .loop(values, this.Int32BE, 2);
                }
            });

            protocol.write().loopArrayIterations([2, 3, 4]).result.should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3]));
        });

        it('loop should stop when end() called', function () {
            var protocol = new Protocol();
            protocol.define('loopArrayEnd', {
                write: function (values) {
                    var i = 0;
                    this
                        .Int32BE(values.length)
                        .loop(values, function (value, end) {
                            this.Int32BE(value);
                            if (i++ === 1) {
                                end();
                            }
                        });
                }
            });

            protocol.write().loopArrayEnd([2, 3, 4]).result.should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3]));
        });
    });

    it('methods should be chainable', function () {
        var protocol = new Protocol();
        protocol.define('char', {
            write: function (char) {
                this.Int8(char.charCodeAt(0));
            }
        });


        protocol.write().skip(0).demand(1).loop(['a', 'b', 'c', 'd'], protocol.writer.char).result.should.be.eql(new Buffer([97, 98, 99, 100]));
    });

    it('reset() should reset writer buffer', function () {
        var protocol = new Protocol();
        protocol.write().Int8(1).reset().Int8(2).result.should.be.eql(new Buffer([2]));
    });

    it('should be able to grow buffer when needed', function () {
        var protocol = new Protocol({
            bufferSize: 8192
        });
        protocol.writer.buffer.length.should.be.eql(8192);
        protocol.write().raw(new Buffer(8192)).Int8(1).Int8(2).result.slice(8192).should.be.eql(new Buffer([1, 2]));
    });

    it('should return a copy of buffer with resultCopy = true', function () {
        var protocol = new Protocol({
            resultCopy: true
        });
        var buffer = protocol.write().Int8(1).Int8(2).result;

        buffer.should.be.eql(new Buffer([1, 2]));
        buffer.writeInt8(10, 0);
        buffer.should.be.eql(new Buffer([10, 2]));
        protocol.writer.buffer.slice(0, 2).should.be.eql(new Buffer([1, 2]));
    });
});
