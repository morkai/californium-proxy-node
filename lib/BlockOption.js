"use strict";

var util = require('util');
var Buffer = require('buffer').Buffer;
var optionRegistry = require('./optionRegistry');
var Option = require('./Option');

var MIN_BLOCK_NUMBER = 0;
var MAX_BLOCK_NUMBER = parseInt('11111111111111111111', 2);
var MAX_BLOCK_NUMBER_FOR_TWO_BYTES = parseInt('111111111111', 2);
var MAX_BLOCK_NUMBER_FOR_ONE_BYTE = parseInt('1111', 2);
var MIN_BLOCK_SIZE = 0;
var MAX_BLOCK_SIZE = 6;

/**
 * @constructor
 * @extends Option
 * @param {Number} number
 * @param {Buffer} data
 * @throws {Error} If the specified data buffer is NULL or empty.
 */
function BlockOption(number, data)
{
  if (!data || data.length === 0)
  {
    throw new Error("Block option data must be a non-empty Buffer.");
  }

  Option.call(this, number, data);
}

util.inherits(BlockOption, Option);

/**
 * @param {Number} number
 * @param {*} value
 * @return {Array.<BlockOption>}
 */
BlockOption.fromValue = function(number, value)
{
  if (Array.isArray(value))
  {
    value = value[0];
  }

  var valueType = typeof value;

  if (valueType === 'string')
  {
    var parts = value.split(',');

    value = {
      num: parts[0],
      m: parts[1],
      szx: parts[2]
    };
  }
  else if (valueType === 'number')
  {
    value = {
      num: 0,
      m: 0,
      size: value
    };
  }

  if (value === null || typeof value !== 'object')
  {
    throw new Error(util.format(
      "Expected an object, got: %s", typeof value
    ));
  }

  var num = parseInt(value.num);

  if (num < MIN_BLOCK_NUMBER || num > MAX_BLOCK_NUMBER)
  {
    throw new Error(util.format(
      "Expected the block number to be between `%s` and `%s`, got `%s`.",
      MIN_BLOCK_NUMBER,
      MAX_BLOCK_NUMBER,
      num
    ));
  }

  var szx;

  if (!('szx' in value) && 'size' in value)
  {
    szx = BlockOption.encodeSzx(value.size);
  }
  else
  {
    szx = parseInt(value.szx);
  }

  if (szx < MIN_BLOCK_SIZE || szx > MAX_BLOCK_SIZE)
  {
    throw new Error(util.format(
      "Expected the block size exponent to be between `%s` and `%s`, got `%s`.",
      MIN_BLOCK_SIZE,
      MAX_BLOCK_SIZE,
      szx
    ));
  }

  var m = value.m && value.m !== '0';
  var data = BlockOption.encode(num, szx, m);

  return [new BlockOption(number, data)];
};

/**
 * @param {Number} num
 * @param {Number} szx
 * @param {Boolean} m
 * @return {Buffer}
 */
BlockOption.encode = function(num, szx, m)
{
  var data;

  if (num <= MAX_BLOCK_NUMBER_FOR_ONE_BYTE)
  {
    data = new Buffer([num << 4]);
  }
  else if (num <= MAX_BLOCK_NUMBER_FOR_TWO_BYTES)
  {
    data = new Buffer([(num & 4080) >> 4, (num & 15) << 4]);
  }
  else
  {
    data = new Buffer([
      (num & 1044480) >> 12,
      (num & 4080) >> 4,
      (num & 15) << 4
    ]);
  }

  var lastByteIndex = data.length - 1;

  data[lastByteIndex] |= szx;

  if (m)
  {
    data[lastByteIndex] |= 8;
  }

  return data;
};

/**
 * @param {Number} blockSize
 * @return {Number}
 */
BlockOption.encodeSzx = function(blockSize)
{
  return Math.floor(Math.log(blockSize) / Math.log(2)) - 4;
};

/**
 * @param {Number} blockSize
 * @return {Number}
 */
BlockOption.decodeSzx = function(szx)
{
  return 1 << (szx + 4);
};

/**
 * @param {Number} szx
 * @return {Boolean}
 */
BlockOption.isValidSzx = function(szx)
{
  return szx >= 0 && szx <= 6;
};

/**
 * @return {Number}
 */
BlockOption.prototype.getBlockNumber = function()
{
  var number;
  var data = this.getData();

  switch (data.length)
  {
    case 0:
      number = 0;
      break;

    case 1:
      number = data[0];
      break;

    case 2:
      number = data.readUInt16BE(0);
      break;

    default:
      number = (data[0] << 16) | data.readUInt16BE(1);
      break;
  }

  return number >> 4;
};

/**
 * @param {Number} blockNumber
 * @return {BlockOption}
 */
BlockOption.prototype.setBlockNumber = function(blockNumber)
{
  this.data = BlockOption.encode(blockNumber, this.getSzx(), this.hasMore());

  return this;
};

/**
 * @return {Boolean}
 */
BlockOption.prototype.hasMore = function()
{
  var data = this.getData();

  return (data[data.length - 1] & 8) === 8;
};

/**
 * @return {Number}
 */
BlockOption.prototype.getSzx = function()
{
  var data = this.getData();

  return data[data.length - 1] & 7;
};

/**
 * @return {Number}
 */
BlockOption.prototype.getSize = function()
{
  return BlockOption.decodeSzx(this.getSzx());
};

/**
 * @return {String}
 */
BlockOption.prototype.toString = function()
{
  return util.format(
    "%s: NUM: %d, M: %s, SZX: %d (%d bytes)",
    optionRegistry.toString(this.getNumber()),
    this.getBlockNumber(),
    this.hasMore(),
    this.getSzx(),
    this.getSize()
  );
};

module.exports = BlockOption;
