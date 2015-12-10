"use strict";

/* global describe, it */

var protocol = require('../lib/index');

describe('Writer', function() {

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
            it('should write ' + p[0], function () {
                var writer, buffer = new Buffer(2 * p[1]), num1, num2;
                if(p[0].indexOf('U') !== 0){ // signed
                    num1 = -123; num2 = 123;
                } else { // unsigned
                    num1 = 123; num2 = 123;
                }
                buffer['write' + p[0]](num1, 0);
                buffer['write' + p[0]](num2, p[1]);

                writer = new protocol.Writer();
                writer[p[0]](num1)[p[0]](num2).result().should.be.eql(buffer);
            });
        });

        it.skip('should write raw bytes', function () {
            var reader, buffer = new Buffer('abcde');

            reader = new protocol.Reader(buffer);
            reader.raw('bytes', 5).result.bytes.toString('utf8').should.be.eql('abcde');
        });
    });

});
