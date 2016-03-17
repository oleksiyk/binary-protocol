'use strict';

/* global describe, it, expect */

var Protocol = require('../lib/index');
var Long     = require('long');

var ProtobufProtocol = Protocol.createProtobufProtocol();
var protocol = new ProtobufProtocol();

describe('Protocol buffers types', function () {
    var MAX_UINT32 = Math.pow(2, 32) - 1, MIN_UINT32 = 0,
        MAX_INT32 = 2147483647, MIN_INT32 = -2147483648,
        MAX_UINT64 = Long.MAX_UNSIGNED_VALUE, MIN_UINT64 = Long.UZERO,
        MAX_INT64 = Long.MAX_VALUE, MIN_INT64 = Long.MIN_VALUE;

    describe('Base 128 Varints', function () {
        it('uint32 max', function () {
            var encoded = protocol.write().uint32(MAX_UINT32).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).uint32('v').result.v.should.be.eql(MAX_UINT32);
        });

        it('uint32 min', function () {
            var encoded = protocol.write().uint32(MIN_UINT32).result;
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).uint32('v').result.v.should.be.eql(MIN_UINT32);
        });

        it('bool', function () {
            var encoded = protocol.write().bool(true).result;
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).bool('v').result.v.should.be.eql(true);
            protocol.writer.reset();
            encoded = protocol.write().bool(false).result;
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).bool('v').result.v.should.be.eql(false);
        });

        it('int32 max', function () {
            var encoded = protocol.write().int32(MAX_INT32).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x07]));
            protocol.read(encoded).int32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('int32 -1', function () {
            var encoded = protocol.write().int32(-1).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).int32('v').result.v.should.be.eql(-1);
        });

        it('int32 1', function () {
            var encoded = protocol.write().int32(1).result;
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).int32('v').result.v.should.be.eql(1);
        });

        it('int32 min', function () {
            var encoded = protocol.write().int32(MIN_INT32).result;
            encoded.should.be.eql(new Buffer([0x80, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).int32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('sint32 max', function () {
            var encoded = protocol.write().sint32(MAX_INT32).result;
            encoded.should.be.eql(new Buffer([0xfe, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).sint32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('sint32 -1', function () {
            var encoded = protocol.write().sint32(-1).result;
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).sint32('v').result.v.should.be.eql(-1);
        });

        it('sint32 1', function () {
            var encoded = protocol.write().sint32(1).result;
            encoded.should.be.eql(new Buffer([0x02]));
            protocol.read(encoded).sint32('v').result.v.should.be.eql(1);
        });

        it('sint32 min', function () {
            var encoded = protocol.write().sint32(MIN_INT32).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).sint32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('uint64 max', function () {
            var encoded = protocol.write().uint64(MAX_UINT64).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).uint64('v').result.v.should.be.eql(MAX_UINT64);
        });

        it('uint64 min', function () {
            var encoded = protocol.write().uint64(MIN_UINT64).result;
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).uint64('v').result.v.should.be.eql(MIN_UINT64);
        });

        it('int64 max', function () {
            var encoded = protocol.write().int64(MAX_INT64).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).int64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('int64 -1', function () {
            var encoded = protocol.write().int64(Long.NEG_ONE).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).int64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('int64 1', function () {
            var encoded = protocol.write().int64(Long.ONE).result;
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).int64('v').result.v.should.be.eql(Long.ONE);
        });

        it('int64 min', function () {
            var encoded = protocol.write().int64(MIN_INT64).result;
            encoded.should.be.eql(new Buffer([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01]));
            protocol.read(encoded).int64('v').result.v.should.be.eql(MIN_INT64);
        });

        it('sint64 max', function () {
            var encoded = protocol.write().sint64(MAX_INT64).result;
            encoded.should.be.eql(new Buffer([0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).sint64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('sint64 -1', function () {
            var encoded = protocol.write().sint64(Long.NEG_ONE).result;
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).sint64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('sint64 1', function () {
            var encoded = protocol.write().sint64(Long.ONE).result;
            encoded.should.be.eql(new Buffer([0x02]));
            protocol.read(encoded).sint64('v').result.v.should.be.eql(Long.ONE);
        });

        it('sint64 min', function () {
            var encoded = protocol.write().sint64(MIN_INT64).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).sint64('v').result.v.should.be.eql(MIN_INT64);
        });
    });

    describe('Fixed length numeric', function () {
        it('fixed32 max', function () {
            var encoded = protocol.write().fixed32(MAX_UINT32).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).fixed32('v').result.v.should.be.eql(MAX_UINT32);
        });

        it('fixed32 min', function () {
            var encoded = protocol.write().fixed32(MIN_UINT32).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).fixed32('v').result.v.should.be.eql(MIN_UINT32);
        });

        it('sfixed32 max', function () {
            var encoded = protocol.write().sfixed32(MAX_INT32).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).sfixed32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('sfixed32 -1', function () {
            var encoded = protocol.write().sfixed32(-1).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).sfixed32('v').result.v.should.be.eql(-1);
        });

        it('sfixed32 1', function () {
            var encoded = protocol.write().sfixed32(1).result;
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00]));
            protocol.read(encoded).sfixed32('v').result.v.should.be.eql(1);
        });

        it('sfixed32 min', function () {
            var encoded = protocol.write().sfixed32(MIN_INT32).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x80]));
            protocol.read(encoded).sfixed32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('float max', function () {
            var encoded = protocol.write().float(+Infinity).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0x7f]));
            protocol.read(encoded).float('v').result.v.should.be.eql(+Infinity);
        });

        it('float 1', function () {
            var encoded = protocol.write().float(1).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0x3f]));
            protocol.read(encoded).float('v').result.v.should.be.eql(1);
        });

        it('float -1', function () {
            var encoded = protocol.write().float(-1).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0xbf]));
            protocol.read(encoded).float('v').result.v.should.be.eql(-1);
        });

        it('float min', function () {
            var encoded = protocol.write().float(-Infinity).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0xff]));
            protocol.read(encoded).float('v').result.v.should.be.eql(-Infinity);
        });

        it('fixed64 max', function () {
            var encoded = protocol.write().fixed64(MAX_UINT64).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).fixed64('v').result.v.should.be.eql(MAX_UINT64);
        });

        it('fixed64 min', function () {
            var encoded = protocol.write().fixed64(MIN_UINT64).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).fixed64('v').result.v.should.be.eql(MIN_UINT64);
        });

        it('double max', function () {
            var encoded = protocol.write().double(Number.MAX_VALUE).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xef, 0x7f]));
            protocol.read(encoded).double('v').result.v.should.be.eql(Number.MAX_VALUE);
        });

        it('double 1', function () {
            var encoded = protocol.write().double(1).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f]));
            protocol.read(encoded).double('v').result.v.should.be.eql(1);
        });

        it('double -1', function () {
            var encoded = protocol.write().double(-1).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0xbf]));
            protocol.read(encoded).double('v').result.v.should.be.eql(-1);
        });

        it('double min', function () {
            var encoded = protocol.write().double(Number.MIN_VALUE).result;
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).double('v').result.v.should.be.eql(Number.MIN_VALUE);
        });

        it('sfixed64 max', function () {
            var encoded = protocol.write().sfixed64(MAX_INT64).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).sfixed64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('sfixed64 -1', function () {
            var encoded = protocol.write().sfixed64(Long.NEG_ONE).result;
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).sfixed64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('sfixed64 1', function () {
            var encoded = protocol.write().sfixed64(Long.ONE).result;
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).sfixed64('v').result.v.should.be.eql(Long.ONE);
        });

        it('sfixed64 min', function () {
            var encoded = protocol.write().sfixed64(MIN_INT64).result;
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]));
            protocol.read(encoded).sfixed64('v').result.v.should.be.eql(MIN_INT64);
        });
    });

    it('bytes', function () {
        var buf = new Buffer('abcde');

        var encoded = protocol.write().bytes(buf).result;
        encoded.should.be.eql(new Buffer([0x05, 0x61, 0x62, 0x63, 0x64, 0x65]));
        protocol.read(encoded).bytes('v').result.v.should.be.eql(buf);
    });

    it('bytes - UTF8 string', function () {
        var str = '人人生而自由，在尊嚴和權利上一律平等。';
        var encoded = protocol.write().bytes(str).result;
        protocol.read(encoded).bytes().result.toString('utf8').should.be.eql(str);
    });

    it('bytes - zero length', function () {
        var buf = new Buffer(0);

        var encoded = protocol.write().bytes(buf).result;
        encoded.should.be.eql(new Buffer([0x00]));
        expect(protocol.read(encoded).bytes('v').result.v).to.be.eql(null);
    });

    it('bytes - null - equivalent to empty buffer', function () {
        var encoded = protocol.write().bytes(null).result;
        encoded.should.be.eql(new Buffer([0x00]));
        expect(protocol.read(encoded).bytes('v').result.v).to.be.eql(null);
    });

    it('bytes - not a buffer', function () {
        function f() {return protocol.write().bytes(123).result; }
        expect(f).to.throw(Error);
    });

    it('string', function () {
        var str = '人人生而自由，在尊嚴和權利上一律平等。';

        var encoded = protocol.write().string(str).result;
        protocol.read(encoded).string('v').result.v.should.be.eql(str);
    });
});
