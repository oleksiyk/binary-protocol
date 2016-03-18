'use strict';

/* global expect, before, describe, it */

var Protocol = require('../lib/index');
var Long     = require('long');

describe('Reader', function () {
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
            it('should read ' + p[0], function () {
                var protocol = new Protocol();
                var buffer = new Buffer(2 * p[1]), num1, num2;
                if (p[0].indexOf('U') !== 0) { // signed
                    num1 = -123; num2 = 123;
                } else { // unsigned
                    num1 = 123; num2 = 123;
                }
                buffer['write' + p[0]](num1, 0);
                buffer['write' + p[0]](num2, p[1]);

                protocol.read(buffer)[p[0]]('num1')[p[0]]('num2').result.should.be.eql({
                    num1: num1,
                    num2: num2
                });
            });
        });

        it('should read raw bytes', function () {
            var protocol = new Protocol();
            var buffer = new Buffer('abcde');
            protocol.read(buffer).raw('bytes', 5).result.bytes.toString('utf8').should.be.eql('abcde');
        });
    });

    describe('64 bits', function () {
        var slong = new Long(0xFFFFFFFF, 0x7FFFFFFF), ulong = new Long(0xFFFFFFFF, 0x7FFFFFFF, true);
        it('Int64BE', function () {
            var protocol = new Protocol();
            var buffer = new Buffer([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
            protocol.read(buffer).Int64BE('long').result.long.toString().should.be.eql(slong.toString());
        });

        it('Int64LE', function () {
            var protocol = new Protocol();
            var buffer = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
            protocol.read(buffer).Int64LE('long').result.long.toString().should.be.eql(slong.toString());
        });

        it('UInt64BE', function () {
            var protocol = new Protocol();
            var buffer = new Buffer([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
            protocol.read(buffer).UInt64BE('long').result.long.toString().should.be.eql(ulong.toString());
        });

        it('UInt64LE', function () {
            var protocol = new Protocol();
            var buffer = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
            protocol.read(buffer).UInt64LE('long').result.long.toString().should.be.eql(ulong.toString());
        });
    });

    describe('nested objects and arrays', function () {
        var buffer = new Buffer(16);

        before(function () {
            buffer.writeInt32BE(3, 0);
            buffer.writeInt32BE(2, 4);
            buffer.writeInt32BE(3, 8);
            buffer.writeInt32BE(4, 12);
        });

        it('should create nested result object', function () {
            var protocol = new Protocol();
            protocol.define('nested', {
                read: function () {
                    this
                        .Int32BE('a1')
                        .Int32BE('a2')
                        .Int32BE('a3');
                }
            });

            protocol.read(buffer).Int32BE('a0').nested('nested').result.should.be.eql({
                a0: 3,
                nested: {
                    a1: 2,
                    a2: 3,
                    a3: 4
                }
            });
        });

        it('should allow custom array results', function () {
            var protocol = new Protocol();
            protocol.define('customArray', {
                read: function () {
                    var i = 0;
                    this
                        .Int32BE('length');

                    for (i = 0; i < this.context.length; i++) {
                        this.Int32BE(['items', i]);
                    }

                    return this.context.items;
                }
            });

            protocol.read(buffer).customArray('items').result.should.be.eql({
                items: [2, 3, 4]
            });
        });

        it('should build arrays with loop() method', function () {
            var protocol = new Protocol();
            protocol.define('loopArray', {
                read: function () {
                    this
                        .Int32BE('length')
                        .loop('items', this.Int32BE, this.context.length);
                    return this.context.items;
                }
            });

            protocol.read(buffer).loopArray('array').result.should.be.eql({
                array: [2, 3, 4]
            });
        });

        it('loop() should stop when end() is called', function () {
            var protocol = new Protocol();
            protocol.define('loopArrayEnd', {
                read: function () {
                    var len;
                    this.Int32BE('length');
                    len = this.context.length;
                    this.loop('items', function (end) {
                        this.Int32BE();
                        if ((len -= 1) === 0) { end(); }
                    });
                    return this.context.items;
                }
            });

            protocol.read(buffer).loopArrayEnd('items').result.should.be.eql({
                items: [2, 3, 4]
            });
        });
    });

    it('primitive method should throw RangeError when trying to read beyond buffer length', function () {
        var protocol = new Protocol();
        var buffer = new Buffer('abcde');

        expect(function () {
            protocol.read(buffer).loop('chars', protocol.reader.Int8, 6);
        }).to.throw(RangeError);
    });

    it('raw() should throw RangeError when trying to read beyond buffer length', function () {
        var protocol = new Protocol();
        var buffer = new Buffer('abcde');

        expect(function () {
            protocol.read(buffer).raw('chars', 6);
        }).to.throw(RangeError);
    });

    it('methods should be chainable', function () {
        var protocol = new Protocol();
        var buffer = new Buffer('abcde');

        protocol.define('char', {
            read: function () {
                this.Int8('char');
                return String.fromCharCode(this.context.char);
            }
        });

        protocol.read(buffer).skip(1).demand(1).loop('chars', protocol.reader.char, 4).result.should.be.eql({ chars: ['b', 'c', 'd', 'e'] });
    });

    it('should be possible to create dynamic fields', function () {
        var protocol = new Protocol();
        var buffer = new Buffer(6);

        buffer.write('xname');
        buffer.writeInt8(10, 5);

        protocol.define('dynamic', {
            read: function () {
                var r = {};
                this
                    .raw('field_name', 5)
                    .Int8('field_value');
                // create new field
                r[this.context.field_name.toString('utf8')] = this.context.field_value;
                this.context = r;
            }
        });

        protocol.read(buffer).dynamic('obj').result.should.be.eql({ obj: { xname: 10 } });
    });

    it('should assign properties to top context when top context has no name', function () {
        var protocol = new Protocol();
        var buffer = new Buffer(2);

        buffer.writeInt8(1, 0);
        buffer.writeInt8(2, 1);

        protocol.define('_emptyname', {
            read: function () {
                this
                    .Int8('f1')
                    .Int8('f2');
            }
        });

        protocol.define('emptyname', {
            read: function () {
                this._emptyname();
            }
        });

        protocol.read(buffer).emptyname().result.should.be.eql({ f1: 1, f2: 2 });
    });

    it('should assign properties to top context when top context has no name when overwriting context', function () {
        var protocol = new Protocol();
        var buffer = new Buffer(2);

        buffer.writeInt8(1, 0);
        buffer.writeInt8(2, 1);

        protocol.define('_emptyname', {
            read: function () {
                return this.Int8().context + this.Int8().context;
            }
        });

        protocol.define('emptyname', {
            read: function () {
                this._emptyname();
            }
        });

        protocol.read(buffer).emptyname().result.should.be.eql(3);
    });

    it('should assign properties to top context when top context has no name in the loop', function () {
        var protocol = new Protocol();
        var buffer = new Buffer('abcde');

        protocol.define('char', {
            read: function () {
                return String.fromCharCode(this.Int8().context);
            }
        });

        protocol.read(buffer).loop('chars', protocol.reader.char, 5).result.should.be.eql({ chars: ['a', 'b', 'c', 'd', 'e'] });
    });

    it('should support namespaces', function () {
        var protocol = new Protocol();
        var buffer = new Buffer('a');

        protocol.define('char', {
            read: function () {
                return String.fromCharCode(this.Int8().context);
            }
        }, 'org.test.types');

        protocol.read(buffer).org.test.types.char('char').result.should.be.eql({ char: 'a' });
    });
});
