'use strict';

/* global describe, it, expect */

var Protocol = require('../lib/index');
var fs       = require('fs');
var path     = require('path');
var Long     = require('long');

describe('Protobuf', function () {
    it('should parse basic types', function () {
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

        protocol.parseProto(fs.readFileSync(path.join(__dirname, './basic.proto')));

        encoded = protocol.write().basic.Test(obj).result;
        encoded.should.be.eql(buffer);
        protocol.read(encoded).basic.Test().result.should.be.eql(obj);
    });

    it('should parse complex embedded messages', function () {
        var protocol = new Protocol({
            protobuf: true
        });

        var obj = {
            model: 'Rusty',
            vendor: {
                name: 'Iron Inc.',
                address: {
                    country: 'US'
                }
            },
            speed: 2
        };

        var buffer = new Buffer([10, 5, 82, 117, 115, 116, 121, 18, 17, 10, 9, 73, 114, 111, 110, 32, 73, 110, 99, 46, 18, 4, 10, 2, 85, 83, 24, 2]);

        var encoded;

        protocol.parseProto(fs.readFileSync(path.join(__dirname, './complex.proto')));

        encoded = protocol.write().Game.Cars.Car(obj).result;

        encoded.should.be.eql(buffer);

        protocol.read(encoded).Game.Cars.Car().result.should.be.eql(obj);
    });
});
