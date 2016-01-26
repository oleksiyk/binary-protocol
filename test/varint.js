'use strict';

/* global describe, it, expect */

var Protocol = require('../lib/index');
var Long     = require('long');

// https://github.com/google/protobuf/blob/master/src/google/protobuf/io/coded_stream_unittest.cc

var protocol = new Protocol();

describe('Varint', function () {
    var VARINT32_VALUES = [
      [new Buffer([0x00]), 1, 0],
      [new Buffer([0x01]), 1, 1],
      [new Buffer([0x7f]), 1, 127],
      [new Buffer([0xa2, 0x74]), 2, (0x22 << 0) | (0x74 << 7)],          // 14882
      [new Buffer([0xbe, 0xf7, 0x92, 0x84, 0x0b]), 5,                    // 2961488830
        ((0x3e << 0) | (0x77 << 7) | (0x12 << 14) | (0x04 << 21) | ((0x0b) << 28)) >>> 0]
    ];

    var VARINT64_VALUES = [
        [new Buffer([0xbe, 0xf7, 0x92, 0x84, 0x1b]), 5, Long.fromString('7256456126', true)],
        [new Buffer([0x80, 0xe6, 0xeb, 0x9c, 0xc3, 0xc9, 0xa4, 0x49]), 8, Long.fromString('41256202580718336', true)],
        [new Buffer([0x9b, 0xa8, 0xf9, 0xc2, 0xbb, 0xd6, 0x80, 0x85, 0xa6, 0x01]), 10, Long.fromString('11964378330978735131', true)]
    ];

    var MALFORMED = new Buffer([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x00]);
    var TRUNCATED = new Buffer([0x80]);

    VARINT32_VALUES.forEach(function (test, ind) {
        it('UVarint 32 bit #' + ind, function () {
            var encoded = protocol.write().UVarint(test[2]).result;
            encoded.should.be.eql(test[0]);
            protocol.read(encoded).UVarint('v').result.v.should.be.eql(test[2]);
        });
    });

    VARINT64_VALUES.forEach(function (test, ind) {
        it('UVarint 64 bit #' + ind, function () {
            var encoded = protocol.write().UVarint64(test[2]).result;
            encoded.should.be.eql(test[0]);
            protocol.read(encoded).UVarint64('v').result.v.should.be.eql(test[2]);
        });
    });

    it('InvalidProtocolBufferException: Malformed varint', function () {
        function t() {return protocol.read(MALFORMED).UVarint('v').result; }
        function t64() {return protocol.read(MALFORMED).UVarint64('v').result; }
        expect(t).to.throw('Malformed varint');
        expect(t64).to.throw('Malformed varint');
    });

    it('InvalidProtocolBufferException: Truncated message', function () {
        function t() {return protocol.read(TRUNCATED).UVarint('v').result; }
        function t64() {return protocol.read(TRUNCATED).UVarint64('v').result; }
        expect(t).to.throw('Truncated message');
        expect(t64).to.throw('Truncated message');
    });
});
