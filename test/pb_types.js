'use strict';

/* global describe, it, expect */

var protocol = require('../lib/index');
var Long     = require('long');

protocol.protobuf(); // enable protocl buffers support

describe('Protocol buffers types', function () {
    var MAX_UINT32 = Math.pow(2, 32) - 1, MIN_UINT32 = 0,
        MAX_INT32 = 2147483647, MIN_INT32 = -2147483648,
        MAX_UINT64 = Long.MAX_UNSIGNED_VALUE, MIN_UINT64 = Long.UZERO,
        MAX_INT64 = Long.MAX_VALUE, MIN_INT64 = Long.MIN_VALUE;

    describe('Base 128 Varints', function () {
        it('uint32 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_uint32(MAX_UINT32).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).pb_uint32('v').result.v.should.be.eql(MAX_UINT32);
        });

        it('uint32 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_uint32(MIN_UINT32).result();
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).pb_uint32('v').result.v.should.be.eql(MIN_UINT32);
        });

        it('bool', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_bool(true).result();
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).pb_bool('v').result.v.should.be.eql(true);
            writer.reset();
            encoded = writer.pb_bool(false).result();
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).pb_bool('v').result.v.should.be.eql(false);
        });

        it('int32 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int32(MAX_INT32).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x07]));
            protocol.read(encoded).pb_int32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('int32 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int32(-1).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_int32('v').result.v.should.be.eql(-1);
        });

        it('int32 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int32(1).result();
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).pb_int32('v').result.v.should.be.eql(1);
        });

        it('int32 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int32(MIN_INT32).result();
            encoded.should.be.eql(new Buffer([0x80, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_int32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('sint32 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint32(MAX_INT32).result();
            encoded.should.be.eql(new Buffer([0xfe, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).pb_sint32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('sint32 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint32(-1).result();
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).pb_sint32('v').result.v.should.be.eql(-1);
        });

        it('sint32 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint32(1).result();
            encoded.should.be.eql(new Buffer([0x02]));
            protocol.read(encoded).pb_sint32('v').result.v.should.be.eql(1);
        });

        it('sint32 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint32(MIN_INT32).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
            protocol.read(encoded).pb_sint32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('uint64 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_uint64(MAX_UINT64).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_uint64('v').result.v.should.be.eql(MAX_UINT64);
        });

        it('uint64 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_uint64(MIN_UINT64).result();
            encoded.should.be.eql(new Buffer([0x00]));
            protocol.read(encoded).pb_uint64('v').result.v.should.be.eql(MIN_UINT64);
        });

        it('int64 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int64(MAX_INT64).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).pb_int64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('int64 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int64(Long.NEG_ONE).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_int64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('int64 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int64(Long.ONE).result();
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).pb_int64('v').result.v.should.be.eql(Long.ONE);
        });

        it('int64 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_int64(MIN_INT64).result();
            encoded.should.be.eql(new Buffer([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01]));
            protocol.read(encoded).pb_int64('v').result.v.should.be.eql(MIN_INT64);
        });

        it('sint64 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint64(MAX_INT64).result();
            encoded.should.be.eql(new Buffer([0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_sint64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('sint64 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint64(Long.NEG_ONE).result();
            encoded.should.be.eql(new Buffer([0x01]));
            protocol.read(encoded).pb_sint64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('sint64 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint64(Long.ONE).result();
            encoded.should.be.eql(new Buffer([0x02]));
            protocol.read(encoded).pb_sint64('v').result.v.should.be.eql(Long.ONE);
        });

        it('sint64 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sint64(MIN_INT64).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
            protocol.read(encoded).pb_sint64('v').result.v.should.be.eql(MIN_INT64);
        });
    });

    describe('Fixed length numeric', function () {
        it('fixed32 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_fixed32(MAX_UINT32).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).pb_fixed32('v').result.v.should.be.eql(MAX_UINT32);
        });

        it('fixed32 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_fixed32(MIN_UINT32).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).pb_fixed32('v').result.v.should.be.eql(MIN_UINT32);
        });

        it('sfixed32 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed32(MAX_INT32).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).pb_sfixed32('v').result.v.should.be.eql(MAX_INT32);
        });

        it('sfixed32 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed32(-1).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).pb_sfixed32('v').result.v.should.be.eql(-1);
        });

        it('sfixed32 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed32(1).result();
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00]));
            protocol.read(encoded).pb_sfixed32('v').result.v.should.be.eql(1);
        });

        it('sfixed32 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed32(MIN_INT32).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x80]));
            protocol.read(encoded).pb_sfixed32('v').result.v.should.be.eql(MIN_INT32);
        });

        it('float max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_float(+Infinity).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0x7f]));
            protocol.read(encoded).pb_float('v').result.v.should.be.eql(+Infinity);
        });

        it('float 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_float(1).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0x3f]));
            protocol.read(encoded).pb_float('v').result.v.should.be.eql(1);
        });

        it('float -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_float(-1).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0xbf]));
            protocol.read(encoded).pb_float('v').result.v.should.be.eql(-1);
        });

        it('float min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_float(-Infinity).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x80, 0xff]));
            protocol.read(encoded).pb_float('v').result.v.should.be.eql(-Infinity);
        });

        it('fixed64 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_fixed64(MAX_UINT64).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).pb_fixed64('v').result.v.should.be.eql(MAX_UINT64);
        });

        it('fixed64 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_fixed64(MIN_UINT64).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).pb_fixed64('v').result.v.should.be.eql(MIN_UINT64);
        });

        it('double max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_double(Number.MAX_VALUE).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xef, 0x7f]));
            protocol.read(encoded).pb_double('v').result.v.should.be.eql(Number.MAX_VALUE);
        });

        it('double 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_double(1).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f]));
            protocol.read(encoded).pb_double('v').result.v.should.be.eql(1);
        });

        it('double -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_double(-1).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0xbf]));
            protocol.read(encoded).pb_double('v').result.v.should.be.eql(-1);
        });

        it('double min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_double(Number.MIN_VALUE).result();
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).pb_double('v').result.v.should.be.eql(Number.MIN_VALUE);
        });

        it('sfixed64 max', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed64(MAX_INT64).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]));
            protocol.read(encoded).pb_sfixed64('v').result.v.should.be.eql(MAX_INT64);
        });

        it('sfixed64 -1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed64(Long.NEG_ONE).result();
            encoded.should.be.eql(new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
            protocol.read(encoded).pb_sfixed64('v').result.v.should.be.eql(Long.NEG_ONE);
        });

        it('sfixed64 1', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed64(Long.ONE).result();
            encoded.should.be.eql(new Buffer([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            protocol.read(encoded).pb_sfixed64('v').result.v.should.be.eql(Long.ONE);
        });

        it('sfixed64 min', function () {
            var writer = new protocol.Writer();
            var encoded = writer.pb_sfixed64(MIN_INT64).result();
            encoded.should.be.eql(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]));
            protocol.read(encoded).pb_sfixed64('v').result.v.should.be.eql(MIN_INT64);
        });
    });

    it('bytes', function () {
        var buf = new Buffer('abcde');
        var writer = new protocol.Writer();
        var encoded = writer.pb_bytes(buf).result();
        encoded.should.be.eql(new Buffer([0x05, 0x61, 0x62, 0x63, 0x64, 0x65]));
        protocol.read(encoded).pb_bytes('v').result.v.should.be.eql(buf);
    });

    it('bytes - zero length', function () {
        var buf = new Buffer(0);
        var writer = new protocol.Writer();
        var encoded = writer.pb_bytes(buf).result();
        encoded.should.be.eql(new Buffer([0x00]));
        expect(protocol.read(encoded).pb_bytes('v').result.v).to.be.eql(null);
    });

    it('bytes - null', function () {
        var writer = new protocol.Writer();
        var encoded = writer.pb_bytes(null).result();
        encoded.should.be.eql(new Buffer(0));
    });

    it('bytes - not a buffer', function () {
        var writer = new protocol.Writer();
        function f() {return writer.pb_bytes(123).result(); }
        expect(f).to.throw(Error);
    });

    it('string', function () {
        var str = '人人生而自由，在尊嚴和權利上一律平等。';
        var writer = new protocol.Writer();
        var encoded = writer.pb_string(str).result();
        protocol.read(encoded).pb_string('v').result.v.should.be.eql(str);
    });
});
