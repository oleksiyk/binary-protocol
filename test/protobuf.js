'use strict';

/* global describe, it, expect */

var Protocol = require('../lib/index');
var fs       = require('fs');
var path     = require('path');
var Long     = require('long');

describe('Protobuf', function () {
    it('should parse/build basic types', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var obj = {
            int32: 1,
            uint32: 2,
            sint32: 3,
            bool: true,
            int64: Long.fromNumber(4),
            uint64: Long.fromNumber(5, true),
            sint64: Long.fromNumber(6),
            fixed64: Long.fromNumber(7, true),
            sfixed64: Long.fromNumber(8),
            double: 9,
            fixed32: 10,
            sfixed32: 11,
            float: 12,
            bytes: new Buffer('abcde'),
            string: 'Hello',
            myenum: 2,
            strings: ['qwe', 'asd']
        };

        var buffer = new Buffer([8, 1, 16, 2, 24, 6, 32, 1, 40, 4, 48, 5, 56, 12, 65, 7, 0, 0, 0, 0, 0, 0,
            0, 73, 8, 0, 0, 0, 0, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 34, 64, 93, 10, 0, 0, 0, 101, 11,
            0, 0, 0, 109, 0, 0, 64, 65, 114, 5, 97, 98, 99, 100, 101, 122, 5, 72, 101, 108, 108, 111,
            128, 1, 2, 138, 1, 3, 113, 119, 101, 138, 1, 3, 97, 115, 100]);

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/basic.proto')));

        encoded = protocol.write().basic.Test(obj).result;
        encoded.should.be.eql(buffer);
        protocol.read(encoded).basic.Test().result.should.be.eql(obj);
    });

    it('should parse/build complex embedded messages', function () {
        var protocol = new Protocol({
            protobuf: true
        });

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

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/complex.proto')));

        encoded = protocol.write().Game.Cars.Car(obj).result;

        encoded.should.be.eql(buffer);

        protocol.read(encoded).Game.Cars.Car().result.should.be.eql(obj);
    });

    it('should parse/build embedded messages with referenced field types', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var obj = {
            first_name: 'John',
            last_name: 'Doe',
            address: {
                country: 'US'
            }
        };

        var buffer = new Buffer([10, 4, 74, 111, 104, 110, 18, 3, 68, 111, 101, 26, 4, 10, 2, 85, 83]);

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/complex.proto')));

        encoded = protocol.write().Game.Cars.Car.Holder(obj).result;

        encoded.should.be.eql(buffer);

        protocol.read(encoded).Game.Cars.Car.Holder().result.should.be.eql(obj);
    });

    it('reader should throw on unknown message tag', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var buffer = new Buffer([144, 1, 1]);
        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/basic.proto')));

        function f() {
            protocol.read(buffer).basic.Test();
        }

        expect(f).to.throw('Unknown message tag');
    });

    it('writer should use default option with required fields', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var buffer = new Buffer([8, 133, 255, 255, 255, 255, 255, 255, 255, 255, 1, 16, 123, 24,
            245, 1, 32, 0, 40, 133, 255, 255, 255, 255, 255, 255, 255, 255, 1, 48, 123, 56, 245,
            1, 65, 123, 0, 0, 0, 0, 0, 0, 0, 73, 133, 255, 255, 255, 255, 255, 255, 255, 81, 102,
            102, 102, 102, 102, 198, 94, 64, 93, 123, 0, 0, 0, 101, 133, 255, 255, 255, 109, 0, 0,
            246, 66, 114, 3, 113, 119, 101, 122, 3, 97, 115, 100, 128, 1, 2]);

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/defaults-required.proto')));

        protocol.write().basic.Test({}).result.should.be.eql(buffer);
    });

    it('writer should not use default option with optional fields', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/defaults-optional.proto')));

        protocol.write().basic.Test({}).result.should.be.eql(new Buffer(0));
    });

    it('writer should throw on missing required field', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/required-no-defaults.proto')));

        function f() {
            protocol.write().basic.Test({});
        }

        expect(f).to.throw('Missing required field basic.Test:int32');
    });

    it('reader should use default option with optional fields', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/defaults-optional.proto')));

        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            int32: -123,
            uint32: 123,
            sint32: -123,
            bool: false,
            int64: Long.fromNumber(-123),
            uint64: Long.fromNumber(123, true),
            sint64: Long.fromNumber(-123),
            fixed64: Long.fromNumber(123, true),
            sfixed64: Long.fromNumber(-123),
            double: 123.1,
            fixed32: 123,
            sfixed32: -123,
            float: 123,
            bytes: new Buffer('qwe'),
            string: 'asd',
            myenum: 2
        });
    });

    it('reader should use default option with required fields', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/defaults-required.proto')));

        encoded = protocol.write().basic.Test({}).result;
        protocol.read(encoded).basic.Test().result.should.be.eql({
            int32: -123,
            uint32: 123,
            sint32: -123,
            bool: false,
            int64: Long.fromNumber(-123),
            uint64: Long.fromNumber(123, true),
            sint64: Long.fromNumber(-123),
            fixed64: Long.fromNumber(123, true),
            sfixed64: Long.fromNumber(-123),
            double: 123.1,
            fixed32: 123,
            sfixed32: -123,
            float: 123,
            bytes: new Buffer('qwe'),
            string: 'asd',
            myenum: 2
        });
    });

    it('reader should use type-specific default value with optional fields', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/basic.proto')));
        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            int32: 0,
            uint32: 0,
            sint32: 0,
            bool: false,
            int64: Long.ZERO,
            uint64: Long.UZERO,
            sint64: Long.ZERO,
            fixed64: Long.UZERO,
            sfixed64: Long.ZERO,
            double: 0,
            fixed32: 0,
            sfixed32: 0,
            float: 0,
            bytes: new Buffer(0),
            string: '',
            myenum: 1,
            strings: []
        });
    });

    it('handle misc default options', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/defaults-misc.proto')));
        protocol.read(new Buffer(0)).basic.Test().result.should.be.eql({
            string1: 'asd',
            string2: 'asd',
            string3: 'asd',
            test: null
        });
    });

    it('proto file without package', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, 'proto/no-package.proto')));

        encoded = protocol.write().Test({
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
});
