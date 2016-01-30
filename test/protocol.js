'use strict';

/* global expect, before, describe, it */

var Protocol = require('../lib/index');

describe('Protocol definitions', function () {
    it('should be able to define new methods', function () {
        var protocol;

        Protocol.define('gtest1', {
            read: function () {}
        });

        protocol = new Protocol();

        protocol.read().should.respondTo('gtest1');
    });

    it('createProtocol() should call supplied function in constructor', function () {
        var protocol,
            Protocol1 = Protocol.createProtocol(function () {
                this.test = 'passed';
            });

        protocol = new Protocol1();

        protocol.should.have.property('test', 'passed');
    });

    it('new methods should be inherited with .createProtocol()', function () {
        var Protocol1, protocol;

        Protocol.define('gtest2', {
            read: function () {}
        });

        Protocol1 = Protocol.createProtocol();

        protocol = new Protocol1();

        protocol.read().should.respondTo('gtest2');
    });

    it('child methods should not be available in parent protocol', function () {
        var Protocol1, protocol1, protocol;

        Protocol1 = Protocol.createProtocol();

        Protocol1.define('gtest3', {
            read: function () {}
        });

        protocol1 = new Protocol1();
        protocol = new Protocol();

        protocol1.read().should.respondTo('gtest3');
        protocol.read().should.not.respondTo('gtest3');
    });

    it('methods with namespaces', function () {
        var Protocol1, protocol;

        Protocol1 = Protocol.createProtocol();

        Protocol1.define('test1', {
            read: function () {}
        }, 'namespace');

        protocol = new Protocol1();

        protocol.read().namespace.should.respondTo('test1');
    });

    it('child protocols should not share own methods', function () {
        var Protocol1, Protocol2, protocol1, protocol2;

        Protocol1 = Protocol.createProtocol();
        Protocol2 = Protocol.createProtocol();

        Protocol1.define('test1', {
            read: function () {}
        }, 'test');

        Protocol2.define('test2', {
            read: function () {}
        }, 'test');

        protocol1 = new Protocol1();
        protocol2 = new Protocol2();

        protocol1.read().test.should.respondTo('test1');
        protocol1.read().test.should.not.respondTo('test2');

        protocol2.read().test.should.respondTo('test2');
        protocol2.read().test.should.not.respondTo('test1');
    });
});
