'use strict';

/* global describe, it */

var protocol = require('../lib/index');

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
                var buffer = new Buffer(2 * p[1]), num1, num2;
                if (p[0].indexOf('U') !== 0) { // signed
                    num1 = -123; num2 = 123;
                } else { // unsigned
                    num1 = 123; num2 = 123;
                }
                buffer['write' + p[0]](num1, 0);
                buffer['write' + p[0]](num2, p[1]);

                protocol.write()[p[0]](num1)[p[0]](num2).result().should.be.eql(buffer);
            });
        });

        it('should write raw bytes from buffer', function () {
            var buffer = new Buffer([1, 2, 3, 4]);

            protocol.write().raw(buffer).result().should.be.eql(buffer);
        });

        it('should write raw bytes from string', function () {
            var writer, string = 'abcde';

            writer = new protocol.Writer();
            writer.raw(string).result().toString('utf8').should.be.eql('abcde');
        });

        it('should write raw bytes from array of octets', function () {
            var writer, array = [1, 2, 3, 4];

            writer = new protocol.Writer();
            writer.raw(array).result().should.be.eql(new Buffer(array));
        });
    });

    describe('arrays (loop)', function () {
        var writer;

        it('should write custom array', function () {
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

            writer = new protocol.Writer();
            writer.customArray([2, 3, 4]).result().should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4]));
        });

        it('should write arrays with loop() method', function () {
            protocol.define('loopArray', {
                write: function (values) {
                    this
                        .Int32BE(values.length)
                        .loop(values, this.Int32BE);
                }
            });

            writer = new protocol.Writer();
            writer.loopArray([2, 3, 4]).result().should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4]));
        });

        it('loop should honour iterations argument', function () {
            protocol.define('loopArrayIterations', {
                write: function (values) {
                    this
                        .Int32BE(values.length)
                        .loop(values, this.Int32BE, 2);
                }
            });

            writer = new protocol.Writer();
            writer.loopArrayIterations([2, 3, 4]).result().should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3]));
        });

        it('loop should stop when end() called', function () {
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

            writer = new protocol.Writer();
            writer.loopArrayEnd([2, 3, 4]).result().should.be.eql(new Buffer([0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3]));
        });
    });

    it('methods should be chainable', function () {
        var writer;

        protocol.define('char', {
            write: function (char) {
                this.Int8(char.charCodeAt(0));
            }
        });

        writer = new protocol.Writer();
        writer.skip(0).demand(1).loop(['a', 'b', 'c', 'd'], writer.char).result().should.be.eql(new Buffer([97, 98, 99, 100]));
    });
});
