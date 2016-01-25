'use strict';

var Long = require('long');

exports.dezigzag = function (value) {
    return (value >>> 1) ^ -(value & 1);
};

exports.read = function (buffer, offset) {
    var byte;
    var result = 0;
    var position = offset || 0;
    var shift = 0;

    do {
        byte = buffer[position++];
        if (byte === undefined) {
            throw new RangeError('ProtocolBuffer: Truncated message');
        }
        if (shift < 7 * 5) { // negative int32 is always 10 bytes according to spec
            result |= (byte & 0x7F) << shift;
        }
        shift += 7;
        if (shift > 7 * 10) {
            throw new Error('ProtocolBuffer: Malformed varint');
        }
    } while ((byte & 0x80) !== 0);

    return { length: (position - offset), value: result >>> 0 };
};

exports.dezigzag64 = function (value) {
    return value.toSigned().shiftRightUnsigned(1).xor(value.and(Long.fromNumber(1)).negate());
};

exports.read64 = function (buffer, offset) {
    var byte;
    var result = Long.ZERO;
    var position = offset || 0;
    var shift = 0;

    do {
        byte = buffer[position++];
        if (byte === undefined) {
            throw new RangeError('ProtocolBuffer: Truncated message');
        }
        result = result.add(Long.fromNumber(byte & 0x7F).shiftLeft(shift));
        shift += 7;
        if (shift > 7 * 10) {
            throw new Error('ProtocolBuffer: Malformed varint');
        }
    } while ((byte & 0x80) !== 0);

    return { length: (position - offset), value: result.toUnsigned() };
};

exports.zigzag = function (value) {
    return (value << 1) ^ (value >> 31);
};

exports.write = function (buffer, number, offset) {
    var position = offset || 0;

    offset = offset || 0;

    number = number >>> 0;

    while ((number & ~0x7F) >>> 0) {
        buffer[position] = ((number & 0xFF) >>> 0) | 0x80;
        number = number >>> 7;
        position++;
    }

    buffer[position] = number;

    return position - offset + 1;
};

exports.zigzag64 = function (value) {
    return value.shiftLeft(1).xor(value.shiftRight(63));
};

exports.write64 = function (buffer, number, offset) {
    var position = offset || 0;
    var L1 = Long.fromNumber(~0x7F);
    var L2 = Long.fromNumber(0xFF);
    var L3 = Long.fromNumber(0x80);

    offset = offset || 0;

    number = number.toUnsigned();

    while (number.and(L1).greaterThan(Long.ZERO)) {
        buffer[position] = number.and(L2).or(L3).toNumber();
        number = number.shiftRightUnsigned(7);
        position++;
    }

    buffer[position] = number.toNumber();

    return position - offset + 1;
};
