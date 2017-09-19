# bin-protocol

[![Build Status][badge-travis]][travis]
[![Test Coverage][badge-coverage]][coverage]
[![david Dependencies][badge-david-deps]][david-deps]
[![david Dev Dependencies][badge-david-dev-deps]][david-dev-deps]
[![license][badge-license]][license]

bin-protocol is a library for parsing and creating arbitrary byte buffers with optional protocol buffers support.

You can build your own type definitions based on the following methods:

* Int8
* UInt8
* Int16LE
* UInt16LE
* Int16BE
* UInt16BE
* Int32LE
* Int32BE
* UInt32LE
* UInt32BE
* FloatLE
* FloatBE
* DoubleLE
* DoubleBE

Int64 support (using [long.js](https://github.com/dcodeIO/long.js)):
* Int64BE
* Int64LE
* UInt64BE
* UInt64LE

Read or write raw bytes:
* raw

Varints:
* UVarint (unsigned 32 bit varint)
* Varint (signed 32 bit varint)
* SVarint (signed zigzag encoded 32 bit varint)
* UVarint64 (unsigned 64 bit varint)
* Varint64 (signed 64 bit varint)
* SVarint64 (signed zigzag encoded 64 bit varint)

Loops (arrays):
* loop

Protocol buffers support: nested messages, packed repeated fields, maps, enums, packages (namespaces), oneofs


### Install
```
$ npm install bin-protocol
```

### Reader examples

Built-in metods:

```javascript
var Protocol = require('bin-protocol');
var protocol = new Protocol();

var result = protocol.read(new Buffer([0, 1, 2, 3]))
    .Int8('num1')
    .Int8('num2')
    .Int8('num3')
    .Int8('num4').result;

console.log(result); // => { num1: 0, num2: 1, num3: 2, num4: 3 }
```

Define custom 'char' and 'array' methods:

```javascript

protocol.define('char', {
    read: function () {
        this.Int8('char');
        return String.fromCharCode(this.context.char); // convert from char code to character
    }
});

protocol.define('array', {
    read: function () {
        this
            .Int8('length')
            .loop('items', this.char, this.context.length); // read 'length' characters with above defined 'char' method
        return this.context.items; // return just items, without 'length' property
    }
});

var result = protocol.read(new Buffer([5, 97, 98, 99, 100, 101])).array('chars').result;

console.log(result); // => { chars: [ 'a', 'b', 'c', 'd', 'e' ] }
```

### Writer examples
```javascript

var buffer = protocol
    .write()
    .Int8(1)
    .Int8(2)
    .Int8(3)
    .result

console.log(buffer); // => <Buffer 01 02 03>
```

Define an array data type which first writes data array length as a single byte
```javascript
protocol.define('array', {
    write: function (values) {
        this
            .Int8(values.length)
            .loop(values, this.Int8); // write all values with Int8 method
    }
});

var buffer = protocol.write().array([2, 3, 4]).result;

console.log(buffer); // => <Buffer 03 02 03 04>
```

Define reader and writer methods together, this one writes (or reads) raw buffer preceeded by its length as 32 bit integer.

```javascript
protocol.define('bytes', {
    read: function () {
        this.Int32BE('length');
        if (this.context.length <= 0) {
            return null;
        }
        this.raw('value', this.context.length);
        return this.context.value;
    },
    write: function (value) {
        if (value === undefined || value === null) {
            this.Int32BE(-1);
        } else {
            if (!Buffer.isBuffer(value)) {
                value = new Buffer(_(value).toString(), 'utf8');
            }
            this
                .Int32BE(value.length)
                .raw(value);
        }
    }
});
```

### Loops (arrays)

Given a buffer where first 32bit integer is a number (3) of further 32bit integers (2,3 and 4):

```javascript
var buffer = new Buffer(16);

buffer.writeInt32BE(3, 0);
buffer.writeInt32BE(2, 4);
buffer.writeInt32BE(3, 8);
buffer.writeInt32BE(4, 12);
```

All next 3 examples are essentialy identical:

Read data with your own code:

```javascript
protocol.define('customArray', {
    read: function () {
        var i = 0;
        this.Int32BE('length');

        for(i = 0; i<this.context.length; i++){
            this.Int32BE(['items', i]);
        }

        return this.context.items;
    }
});

protocol.read(buffer).customArray('items').result; // => { items: [2, 3, 4] }
```

Read with `.loop()` method by providing the length (loop count):

```javascript
protocol.define('loopArray', {
    read: function () {
        this
            .Int32BE('length')
            .loop('items', this.Int32BE, this.context.length);
        return this.context.items;
    }
});

protocol.read(buffer).loopArray('items').result; // => { items: [2, 3, 4] }
```

Read with `.loop()` method until the `end()` is called:

```javascript
protocol.define('loopArrayEnd', {
    read: function () {
        var len;
        this.Int32BE('length');
        len = this.context.length;
        this.loop('items', function (end) {
                this.Int32BE();
                if((len -= 1) === 0){
                    end(); // call end() to break from loop
                }
            });
        return this.context.items;
    }
});

protocol.read(buffer).loopArrayEnd('items').result; // => { items: [2, 3, 4] }
```

See [Kafka protocol](https://github.com/oleksiyk/kafka/tree/master/lib/protocol) for more examples.

### Protocol buffers support

Given a test.proto:

```proto

package basic;

message Test {
    optional string string = 15;
}
```


```javascript
var Protocol = require('bin-protocol');

var TestProtocol = Protocol.createProtobufProtocol(fs.readFileSync(path.join(__dirname, 'test.proto')));

var protocol = new TestProtocol();

// encode message
var encoded = protocol.write().basic.Test({
    string: 'hello'
}).result;

// decode message
var decoded = protocol.read(encoded).basic.Test().result; // => { string: 'hello' }
```

Sebinary-protocol protocol](https://github.com/oleksiyk/binary-protocol/blob/master/lib/protocol.js) for another example.

### Custom protocols

You can define several independent protocols by using `Protocol.createProtocol()` function:

```javascript
var Protocol1 = Protocol.createProtocol();
var Protocol2 = Protocol.createProtocol();

Protocol1.define('message', ...);
Protocol2.define('message', ...);
```

# License (MIT)

Copyright (c) 2015
 Oleksiy Krivoshey.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

[badge-license]: https://img.shields.io/badge/License-MIT-green.svg
[license]: https://github.com/oleksiyk/binary-protocol/blob/master/LICENSE
[badge-travis]: https://api.travis-ci.org/oleksiyk/binary-protocol.svg?branch=master
[travis]: https://travis-ci.org/oleksiyk/binary-protocol
[badge-coverage]: https://codeclimate.com/github/oleksiyk/binary-protocol/badges/coverage.svg
[coverage]: https://codeclimate.com/github/oleksiyk/binary-protocol/coverage
[badge-david-deps]: https://david-dm.org/oleksiyk/binary-protocol.svg
[david-deps]: https://david-dm.org/oleksiyk/binary-protocol
[badge-david-dev-deps]: https://david-dm.org/oleksiyk/binary-protocol/dev-status.svg
[david-dev-deps]: https://david-dm.org/oleksiyk/binary-protocol#info=devDependencies
[badge-bithound-code]: https://www.bithound.io/github/oleksiyk/binary-protocol/badges/code.svg
[bithound-code]: https://www.bithound.io/github/oleksiyk/binary-protocol
[badge-bithound-overall]: https://www.bithound.io/github/oleksiyk/binary-protocol/badges/score.svg
[bithound-overall]: https://www.bithound.io/github/oleksiyk/binary-protocol
[badge-bithound-deps]: https://www.bithound.io/github/oleksiyk/binary-protocol/badges/dependencies.svg
[bithound-deps]: https://www.bithound.io/github/oleksiyk/binary-protocol/master/dependencies/npm
[badge-bithound-dev-deps]: https://www.bithound.io/github/oleksiyk/binary-protocol/badges/devDependencies.svg
[bithound-dev-deps]: https://www.bithound.io/github/oleksiyk/binary-protocol/master/dependencies/npm
