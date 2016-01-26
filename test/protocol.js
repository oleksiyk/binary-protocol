'use strict';

/* global expect, before, describe, it */

var Protocol = require('../lib/index');

describe('custom protocols', function () {
    it('should be able to define new protocol methods on the global prototypes', function () {
        var protocol1 = new Protocol();
        var protocol2 = new Protocol();

        protocol1.read().should.not.respondTo('gtest1');
        protocol2.read().should.not.respondTo('gtest1');
        protocol1.read().should.not.have.ownProperty('gtest1');
        protocol2.read().should.not.have.ownProperty('gtest1');

        Protocol.define('gtest1', {
            read: function () {
                this.Int8();
            }
        });

        protocol1.read().should.respondTo('gtest1');
        protocol2.read().should.respondTo('gtest1');
        protocol1.read().should.not.have.ownProperty('gtest1');
        protocol2.read().should.not.have.ownProperty('gtest1');
    });

    it('should be able to define new protocol methods on the current instance only', function () {
        var protocol1 = new Protocol();
        var protocol2 = new Protocol();
        var buffer = new Buffer([0xff]);

        protocol1.read().should.not.respondTo('gtest2');
        protocol2.read().should.not.respondTo('gtest2');
        protocol1.read().should.not.have.ownProperty('gtest2');
        protocol2.read().should.not.have.ownProperty('gtest2');

        protocol1.define('gtest2', {
            read: function () {
                this.Int8();
            }
        });

        protocol2.define('gtest2', {
            read: function () {
                this.UInt8();
            }
        });

        protocol1.read().should.respondTo('gtest2');
        protocol2.read().should.respondTo('gtest2');
        protocol1.read().should.have.ownProperty('gtest2');
        protocol2.read().should.have.ownProperty('gtest2');

        protocol1.read(buffer).gtest2().result.should.be.eql(-1);
        protocol2.read(buffer).gtest2().result.should.be.eql(255);
    });

    it('should be able to create new protocol type', function () {
        var MyProtocol = Protocol.createProtocol();

        MyProtocol.should.be.a('function');

        MyProtocol.should.respondTo('define');
    });

    it('new protocol type - prototype methods', function () {
        var MyProtocol = Protocol.createProtocol();
        var myprotocol1 = new MyProtocol();
        var myprotocol2 = new MyProtocol();
        var protocol = new Protocol();

        myprotocol1.read().should.not.respondTo('gtest3');
        myprotocol2.read().should.not.respondTo('gtest3');
        myprotocol1.read().should.not.have.ownProperty('gtest3');
        myprotocol2.read().should.not.have.ownProperty('gtest3');

        // should not have local methods of Protocol instances
        myprotocol1.read().should.not.respondTo('gtest2');
        myprotocol1.read().should.not.have.ownProperty('gtest2');

        // it still should have methods defined on parent Protocol
        myprotocol1.read().should.respondTo('gtest1');
        myprotocol1.read().should.not.have.ownProperty('gtest1');

        MyProtocol.define('gtest3', {
            read: function () {
                this.Int8('mp');
            }
        });

        myprotocol1.read().should.respondTo('gtest3');
        myprotocol2.read().should.respondTo('gtest3');
        myprotocol1.read().should.not.have.ownProperty('gtest3');
        myprotocol2.read().should.not.have.ownProperty('gtest3');

        protocol.read().should.not.respondTo('gtest3');
        protocol.read().should.not.have.ownProperty('gtest3');
    });
});
