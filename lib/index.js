'use strict';

var Long   = require('long');
var varint = require('./protobuf/varint');
var Reader = require('./reader');
var Writer = require('./writer');
var _      = require('lodash');
var util   = require('util');

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

function Protocol() {}

Protocol.Reader_ = Reader;
Protocol.Writer_ = Writer;

Protocol.prototype.define = function (name, config, namespace) {
    if (config.read) {
        this.reader.define(name, config.read, namespace);
    }
    if (config.write) {
        this.writer.define(name, config.write, namespace);
    }
};

Protocol.prototype.read = function (buffer) {
    return this.reader.reset(buffer);
};

Protocol.prototype.write = function () {
    return this.writer.reset();
};

function define(name, config, namespace) {
    Reader.define(name, config.read, namespace);
    Writer.define(name, config.write, namespace);
}

function createProtocol(_SuperProtocol, constructor) {
    function _Reader() {
        Reader.apply(this, arguments);
    }

    function _Writer() {
        Writer.apply(this, arguments);
    }

    function _P(options) {
        this.options = options || {};

        this.reader = new _Reader(this.options);
        this.writer = new _Writer(this.options);

        if (typeof constructor === 'function') {
            constructor.call(this);
        }
    }

    _P.Reader_ = _Reader;
    _P.Writer_ = _Writer;

    util.inherits(_P, _SuperProtocol);
    util.inherits(_Reader, _SuperProtocol.Reader_);
    util.inherits(_Writer, _SuperProtocol.Writer_);

    _Reader.prototype.__methods = _SuperProtocol.Reader_.prototype.__methods.slice();
    _Writer.prototype.__methods = _SuperProtocol.Writer_.prototype.__methods.slice();

    _P.define = function (name, config, namespace) {
        if (config.read) {
            Reader.define(name, config.read, namespace, _Reader);
        }
        if (config.write) {
            Writer.define(name, config.write, namespace, _Writer);
        }
    };

    _P.createProtocol = _.partial(createProtocol, _P);

    return _P;
}

primitives.forEach(function (p) {
    define(p[0], {
        read: function () {
            var r = this.buffer['read' + p[0]](this.offset);
            this.offset += p[1];
            return r;
        },
        write: function (value) {
            var r;
            this.demand(p[1]);
            r = this.buffer['write' + p[0]](value, this.offset);
            this.offset += p[1];
            return r;
        }
    });
});

define('raw', {
    read: function (bytes) {
        var r;
        this.demand(bytes);
        r = new Buffer(bytes);
        this.buffer.copy(r, 0, this.offset, this.offset + bytes);
        this.offset += bytes;
        return r;
    },
    write: function (buffer) {
        if (typeof buffer === 'string' || Array.isArray(buffer)) {
            buffer = new Buffer(buffer);
        }
        this.demand(buffer.length);
        buffer.copy(this.buffer, this.offset, 0);
        this.offset += buffer.length;
    }
});

define('Int64BE', {
    read: function () {
        var l = new Long(this.buffer.readInt32BE(this.offset + 4), this.buffer.readInt32BE(this.offset));
        this.offset += 8;
        return l;
    },
    write: function (value) {
        this.demand(8);
        value = Long.fromValue(value);
        this.buffer.writeInt32BE(value.getHighBits(), this.offset);
        this.buffer.writeInt32BE(value.getLowBits(), this.offset + 4);
        this.offset += 8;
    }
});

define('Int64LE', {
    read: function () {
        var l = new Long(this.buffer.readInt32LE(this.offset), this.buffer.readInt32LE(this.offset + 4));
        this.offset += 8;
        return l;
    },
    write: function (value) {
        this.demand(8);
        value = Long.fromValue(value);
        this.buffer.writeInt32LE(value.getHighBits(), this.offset + 4);
        this.buffer.writeInt32LE(value.getLowBits(), this.offset);
        this.offset += 8;
    }
});

define('UInt64BE', {
    read: function () {
        var l = new Long(this.buffer.readUInt32BE(this.offset + 4), this.buffer.readUInt32BE(this.offset), true);
        this.offset += 8;
        return l;
    },
    write: function (value) {
        this.demand(8);
        value = Long.fromValue(value);
        this.buffer.writeUInt32BE(value.getHighBitsUnsigned(), this.offset);
        this.buffer.writeUInt32BE(value.getLowBitsUnsigned(), this.offset + 4);
        this.offset += 8;
    }
});

define('UInt64LE', {
    read: function () {
        var l = new Long(this.buffer.readUInt32LE(this.offset), this.buffer.readUInt32LE(this.offset + 4), true);
        this.offset += 8;
        return l;
    },
    write: function (value) {
        this.demand(8);
        value = Long.fromValue(value);
        this.buffer.writeUInt32LE(value.getHighBitsUnsigned(), this.offset + 4);
        this.buffer.writeUInt32LE(value.getLowBitsUnsigned(), this.offset);
        this.offset += 8;
    }
});

// unsigned varint
define('UVarint', {
    read: function () {
        var v = varint.read(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.demand(5);
        this.offset += varint.write(this.buffer, value, this.offset);
    }
});

// normal signed varint
define('Varint', {
    read: function () {
        return this.UVarint().context | 0;
    },
    // should be 10 bytes long
    // https://developers.google.com/protocol-buffers/docs/encoding?hl=en#signed-integers
    // Quote: "If you use int32 or int64 as the type for a negative number, the resulting varint is always ten bytes long – it is,
    // effectively, treated like a very large unsigned integer.
    // If you use one of the signed types, the resulting varint uses ZigZag encoding, which is much more efficient."
    write: function (value) {
        if (value < 0) {
            this.demand(10);
            this.UVarint64(value);
        } else {
            this.demand(5);
            this.UVarint(value);
        }
    }
});

// zigzag encoded signed varint
define('SVarint', {
    read: function () {
        return varint.dezigzag(this.UVarint().context);
    },
    write: function (value) {
        this.demand(5);
        this.UVarint(varint.zigzag(value));
    }
});

// unsigned varint 64 bit
define('UVarint64', {
    read: function () {
        var v = varint.read64(this.buffer, this.offset);
        this.offset += v.length;
        return v.value;
    },
    write: function (value) {
        this.demand(10);
        value = Long.fromValue(value);
        this.offset += varint.write64(this.buffer, value, this.offset);
    }
});

// normal signed varint 64 bit
define('Varint64', {
    read: function () {
        return this.UVarint64().context.toSigned();
    },
    write: function (value) {
        this.demand(10);
        this.UVarint64(value);
    }
});

// zigzag encoded signed varint 64
define('SVarint64', {
    read: function () {
        return varint.dezigzag64(this.UVarint64().context);
    },
    write: function (value) {
        this.demand(10);
        value = Long.fromValue(value);
        this.UVarint64(varint.zigzag64(value));
    }
});

module.exports = createProtocol(Protocol);
module.exports.createProtobufProtocol = require('./protobuf');
