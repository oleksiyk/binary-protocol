'use strict';

/* global describe, it, expect */

var Protocol = require('../lib/index');
var fs       = require('fs');
var path     = require('path');
var Long     = require('long');

var createProtocol = function (file, options) {
    return Protocol.createProtobufProtocol(fs.readFileSync(path.join(__dirname, file)), options);
};

var BasicProtocol                       = createProtocol('proto/basic.proto');
var BasicNoTypeSpecificDefaultsProtocol = createProtocol('proto/basic.proto', { typeSpecificDefaults: false });
var ComplexProtocol                     = createProtocol('proto/complex.proto');
var DefaultsRequiredProtocol            = createProtocol('proto/defaults-required.proto');
var DefaultsOptionalProtocol            = createProtocol('proto/defaults-optional.proto');
var DefaultsMiscProtocol                = createProtocol('proto/defaults-misc.proto');
var NoPackageProtocol                   = createProtocol('proto/no-package.proto');
var RequiredNoDefaultsProtocol          = createProtocol('proto/required-no-defaults.proto');
var RepeatedPackedProtocol              = createProtocol('proto/packed.proto');
var RepeatedMessageProtocol             = createProtocol('proto/repeated-message.proto');
var OneofProtocol                       = createProtocol('proto/oneof.proto');
var MapProtocol                         = createProtocol('proto/map.proto');

describe('Protobuf', function () {
    it('should parse/build basic types', function () {
        var protocol = new BasicProtocol();

        var obj = {
            int32    : 1,
            uint32   : 2,
            sint32   : 3,
            bool     : true,
            int64    : Long.fromNumber(4),
            uint64   : Long.fromNumber(5, true),
            sint64   : Long.fromNumber(6),
            fixed64  : Long.fromNumber(7, true),
            sfixed64 : Long.fromNumber(8),
            double   : 9,
            fixed32  : 10,
            sfixed32 : 11,
            float    : 12,
            bytes    : new Buffer('abcde'),
            string   : 'Hello',
            myenum   : 2,
            strings  : ['qwe', 'asd']
        };

        var buffer = new Buffer([8, 1, 16, 2, 24, 6, 32, 1, 40, 4, 48, 5, 56, 12, 65, 7, 0, 0, 0, 0, 0, 0,
            0, 73, 8, 0, 0, 0, 0, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 34, 64, 93, 10, 0, 0, 0, 101, 11,
            0, 0, 0, 109, 0, 0, 64, 65, 114, 5, 97, 98, 99, 100, 101, 122, 5, 72, 101, 108, 108, 111,
            128, 1, 2, 138, 1, 3, 113, 119, 101, 138, 1, 3, 97, 115, 100]);

        var encoded = protocol.write().basic.Test(obj).result;
        encoded.should.be.eql(buffer);
        protocol.read(encoded).basic.Test().result.should.be.eql(obj);
    });

    it('should parse/build complex embedded messages', function () {
        var protocol = new ComplexProtocol();

        var obj = {
            model: 'Rusty',
            vendor: {
                name: 'Iron Inc.',
                address: {
                    country: 'US'
                },
                models: []
            },
            speed: 2
        };

        var buffer = new Buffer([10, 5, 82, 117, 115, 116, 121, 18, 17, 10, 9, 73, 114, 111, 110, 32, 73, 110, 99, 46, 18, 4, 10, 2, 85, 83, 24, 2]);

        var encoded = protocol.write().Game.Cars.Car(obj).result;

        encoded.should.be.eql(buffer);

        protocol.read(encoded).Game.Cars.Car().result.should.be.eql(obj);
    });

    it('should parse/build embedded messages with referenced field types', function () {
        var protocol = new ComplexProtocol();

        var obj = {
            first_name: 'John',
            last_name: 'Doe',
            address: {
                country: 'US'
            }
        };

        var buffer = new Buffer([10, 4, 74, 111, 104, 110, 18, 3, 68, 111, 101, 26, 4, 10, 2, 85, 83]);

        var encoded = protocol.write().Game.Cars.Car.Holder(obj).result;

        encoded.should.be.eql(buffer);

        protocol.read(encoded).Game.Cars.Car.Holder().result.should.be.eql(obj);
    });

    it('reader should throw on unknown message tag', function () {
        var protocol = new BasicProtocol();

        var buffer = new Buffer([144, 1, 1]);

        function f() {
            protocol.read(buffer).basic.Test();
        }

        expect(f).to.throw('Unknown message tag');
    });

    it('writer should use default option with required fields', function () {
        var protocol = new DefaultsRequiredProtocol();

        var buffer = new Buffer([8, 133, 255, 255, 255, 255, 255, 255, 255, 255, 1, 16, 123, 24,
            245, 1, 32, 0, 40, 133, 255, 255, 255, 255, 255, 255, 255, 255, 1, 48, 123, 56, 245,
            1, 65, 123, 0, 0, 0, 0, 0, 0, 0, 73, 133, 255, 255, 255, 255, 255, 255, 255, 81, 102,
            102, 102, 102, 102, 198, 94, 64, 93, 123, 0, 0, 0, 101, 133, 255, 255, 255, 109, 0, 0,
            246, 66, 114, 3, 113, 119, 101, 122, 3, 97, 115, 100, 128, 1, 2]);

        protocol.write().basic.Test({}).result.should.be.eql(buffer);
    });

    it('writer should not use default option with optional fields', function () {
        var protocol = new DefaultsOptionalProtocol();
        protocol.write().basic.Test({}).result.should.be.eql(new Buffer(0));
    });

    it('writer should throw on missing required field', function () {
        var protocol = new RequiredNoDefaultsProtocol();

        function f() {
            protocol.write().basic.Test({});
        }

        expect(f).to.throw('Missing required field basic.Test:int32');
    });

    it('reader should use default option with optional fields', function () {
        var protocol = new DefaultsOptionalProtocol();

        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            int32    : -123,
            uint32   : 123,
            sint32   : -123,
            bool     : false,
            int64    : Long.fromNumber(-123),
            uint64   : Long.fromNumber(123, true),
            sint64   : Long.fromNumber(-123),
            fixed64  : Long.fromNumber(123, true),
            sfixed64 : Long.fromNumber(-123),
            double   : 123.1,
            fixed32  : 123,
            sfixed32 : -123,
            float    : 123,
            bytes    : new Buffer('qwe'),
            string   : 'asd',
            myenum   : 2
        });
    });

    it('reader should use default option with required fields', function () {
        var protocol = new DefaultsRequiredProtocol();

        var encoded = protocol.write().basic.Test({}).result;
        protocol.read(encoded).basic.Test().result.should.be.eql({
            int32    : -123,
            uint32   : 123,
            sint32   : -123,
            bool     : false,
            int64    : Long.fromNumber(-123),
            uint64   : Long.fromNumber(123, true),
            sint64   : Long.fromNumber(-123),
            fixed64  : Long.fromNumber(123, true),
            sfixed64 : Long.fromNumber(-123),
            double   : 123.1,
            fixed32  : 123,
            sfixed32 : -123,
            float    : 123,
            bytes    : new Buffer('qwe'),
            string   : 'asd',
            myenum   : 2
        });
    });

    it('reader should use type-specific default value with optional fields', function () {
        var protocol = new BasicProtocol();

        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            int32    : 0,
            uint32   : 0,
            sint32   : 0,
            bool     : false,
            int64    : Long.ZERO,
            uint64   : Long.UZERO,
            sint64   : Long.ZERO,
            fixed64  : Long.UZERO,
            sfixed64 : Long.ZERO,
            double   : 0,
            fixed32  : 0,
            sfixed32 : 0,
            float    : 0,
            bytes    : new Buffer(0),
            string   : '',
            myenum   : 1,
            strings  : []
        });
    });

    it('reader should not use type-specific default value with optional fields when typeSpecificDefaults is set', function () {
        var protocol = new BasicNoTypeSpecificDefaultsProtocol();
        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({});
    });

    it('reader should throw on missing required field', function () {
        var protocol = new RequiredNoDefaultsProtocol();

        function f() {
            protocol.read(new Buffer(0)).basic.Test({});
        }

        expect(f).to.throw('Missing required field basic.Test:int32');
    });

    it('handle misc default options', function () {
        var protocol = new DefaultsMiscProtocol();

        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            string1: 'asd',
            string2: 'asd',
            string3: 'asd',
            test: null
        });
    });

    it('proto file without package', function () {
        var protocol = new NoPackageProtocol();

        var encoded = protocol.write().Test({
            string: 'yo',
            test2: {
                string: 'hi'
            }
        }).result;

        protocol.read(encoded).Test().result.should.be.eql({
            string: 'yo',
            myenum: 1,
            myenum2: 1,
            test2: {
                string: 'hi'
            }
        });
    });

    it('repeated packed = true', function () {
        var protocol = new RepeatedPackedProtocol();

        var encoded = protocol.write().packed.Test({
            nums: [3, 270, 86942]
        }).result;

        encoded.should.be.eql(new Buffer([0x22, 0x06, 0x03, 0x8e, 0x02, 0x9E, 0xA7, 0x05]));

        protocol.read(encoded).packed.Test().result.should.be.eql({
            nums: [3, 270, 86942]
        });
    });

    it('repeated embedded message', function () {
        var protocol = new RepeatedMessageProtocol();
        var user = {
            name: 'John Doe',
            addresses: [
                { country: 'US' },
                { country: 'UA' }
            ]
        };

        var encoded = protocol.write().UserDatabase.User(user).result;

        encoded.should.be.eql(new Buffer([10, 8, 74, 111, 104, 110, 32, 68, 111, 101, 18, 4, 10, 2, 85, 83, 18, 4, 10, 2, 85, 65]));

        protocol.read(encoded).UserDatabase.User().result.should.be.eql(user);
    });

    it('oneof message', function () {
        var protocol = new OneofProtocol();

        var encoded = protocol.write().SampleMessage({
            name1: 'John Doe',
            id1: 12,
            name2: 'John Smith',
            id2: 21,
        }).result;

        protocol.read(encoded).SampleMessage().result.should.be.eql({
            name1: 'John Doe',
            id1: 0,
            name2: 'John Smith',
            id2: 0
        });
    });

    it('map message', function () {
        var protocol = new MapProtocol();

        var msg = {
            items: {
                id1: 'description1',
                id2: 'description2',
            }
        };

        var encoded = protocol.write().map.TODO(msg).result;

        encoded.should.be.eql(new Buffer([10, 19, 10, 3, 105, 100, 49, 18, 12, 100, 101, 115, 99, 114, 105,
            112, 116, 105, 111, 110, 49, 10, 19, 10, 3, 105, 100, 50, 18, 12, 100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 50]));

        protocol.read(encoded).map.TODO().result.should.be.eql(msg);
    });
});
