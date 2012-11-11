"use strict";

var util = require('util');
var Buffer = require('buffer').Buffer;
var helpers = require('./helpers');
var optionRegistry = require('./optionRegistry');
var mediaTypeRegistry = require('./mediaTypeRegistry');
var BlockOption;

/**
 * @constructor
 * @param {Number} number
 * @param {?Buffer} data
 */
function Option(number, data)
{
  /**
   * @private
   * @type Number
   */
  this.number = number;

  /**
   * @private
   * @type ?Buffer
   */
  this.data = data;
}

/**
 * @param {Number} number
 * @param {?Buffer} data
 * @return {Option}
 */
Option.fromNumber = function(number, data)
{
  if (number === optionRegistry.block1 || number === optionRegistry.block2)
  {
    if (typeof BlockOption === 'undefined')
    {
      BlockOption = require('./BlockOption');
    }

    return new BlockOption(number, data);
  }

  return new Option(number, data);
};

/**
 * @param {Number} number
 * @param {*} value
 * @return {Array.<Option>}
 */
Option.fromValue = function(number, value)
{
  if (number === optionRegistry.block1 || number === optionRegistry.block2)
  {
    if (typeof BlockOption === 'undefined')
    {
      BlockOption = require('./BlockOption');
    }

    return BlockOption.fromValue(number, value);
  }

  return createDataFromValue(number, value).map(function(data)
  {
    return new Option(number, data);
  });
};

/**
 * @return {Number}
 */
Option.prototype.getNumber = function()
{
  return this.number;
};

/**
 * @return {Buffer}
 */
Option.prototype.getData = function()
{
  return this.data ? this.data : new Buffer(0);
};

/**
 * @return {Boolean}
 */
Option.prototype.isCritical = function()
{
  return optionRegistry.isCritical(this.number);
};

/**
 * @return {Boolean}
 */
Option.prototype.isElective = function()
{
  return optionRegistry.isElective(this.number);
};

/**
 * @return {Boolean}
 */
Option.prototype.isFencepost = function()
{
  return this.data === null && optionRegistry.isFencepost(this.number);
};

/**
 * @return {Number}
 */
Option.prototype.getNextFencepost = function()
{
  return optionRegistry.getNextFencepost(this.number);
};

/**
 * @return {*}
 */
Option.prototype.getValue = function()
{
  var data = this.getData();

  switch (this.number)
  {
    case optionRegistry.contentType:
    case optionRegistry.accept:
    case optionRegistry.maxAge:
    case optionRegistry.uriPort:
      return helpers.createNumberFromBuffer(data);

    case optionRegistry.proxyUri:
    case optionRegistry.uriHost:
    case optionRegistry.locationPath:
    case optionRegistry.uriPath:
    case optionRegistry.locationQuery:
    case optionRegistry.uriQuery:
      return data.toString();

    default:
      return data;
  }
};

/**
 * @param {String} [encoding]
 * @return {String}
 */
Option.prototype.getStringValue = function(encoding)
{
  return this.getData().toString(encoding);
};

/**
 * @return {Number}
 */
Option.prototype.getNumericValue = function()
{
  return helpers.createNumberFromBuffer(this.getData());
};

/**
 * @return {String}
 */
Option.prototype.toString = function()
{
  var data = this.getData();
  var str = optionRegistry.toString(this.number, data);
  var val;

  switch (this.number)
  {
    case optionRegistry.contentType:
    case optionRegistry.accept:
      val = mediaTypeRegistry.getName(helpers.createNumberFromBuffer(data));
      break;

    case optionRegistry.maxAge:
    case optionRegistry.uriPort:
    case optionRegistry.observe:
      val = helpers.createNumberFromBuffer(data);
      break;

    case optionRegistry.eTag:
    case optionRegistry.token:
    case optionRegistry.ifMatch:
      val = util.inspect(data);
      break;

    case optionRegistry.proxyUri:
    case optionRegistry.uriHost:
    case optionRegistry.locationPath:
    case optionRegistry.uriPath:
    case optionRegistry.locationQuery:
    case optionRegistry.uriQuery:
      val = data.toString();
      break;
  }

  if (typeof val !== 'undefined')
  {
    str += ': ' + val;
  }

  return str;
};

module.exports = Option;

/**
 * @private
 * @param {Number} optionNumber
 * @param {*} optionValue
 * @return {Array.<?Buffer>}
 */
function createDataFromValue(optionNumber, optionValue)
{
  switch (optionNumber)
  {
    case optionRegistry.contentType:
      return prepareMediaTypeValue(optionValue, false);

    case optionRegistry.accept:
      return prepareMediaTypeValue(optionValue, true);

    case optionRegistry.maxAge:
      return [prepareNumericValue(optionValue, 4)];

    case optionRegistry.uriPort:
    case optionRegistry.observe:
      return [prepareNumericValue(optionValue, 2)];

    case optionRegistry.eTag:
      return [prepareOpaqueValue(optionValue, 1)];

    case optionRegistry.token:
    case optionRegistry.ifMatch:
      return [prepareOpaqueValue(optionValue, 0)];

    case optionRegistry.proxyUri:
    case optionRegistry.uriHost:
      return prepareStringValue(optionValue);

    case optionRegistry.locationPath:
    case optionRegistry.uriPath:
      return prepareMultiStringValue(optionValue, '/');

    case optionRegistry.locationQuery:
    case optionRegistry.uriQuery:
      return prepareMultiStringValue(optionValue, '&');

    case optionRegistry.ifNoneMatch:
      return [null];

    default:
      throw new Error(util.format(
        "Unknown option number: %s", optionNumber
      ));
  }
}
/**
 * @private
 * @param {Number|String} value
 * @param {Boolean} allowMultiple
 * @return {Array.<Buffer>}
 * @throws {Error} If value is an array with more than 1 element and multiple media types are disallowed.
 * @throws {Error} If the specified value is not a valid representation of a media type.
 */
function prepareMediaTypeValue(value, allowMultiple)
{
  var mediaTypes = Array.isArray(value) ? value : [value];

  if (!allowMultiple && mediaTypes.length > 1)
  {
    throw new Error("Multiple Content-Type options are not allowed.");
  }

  return mediaTypes.map(function(mediaType)
  {
    var code = mediaTypeRegistry.getCode(mediaType);

    if (code === -1)
    {
      throw new Error(util.format(
        "Invalid value for media type: %s", mediaType
      ));
    }

    return helpers.createNumericValueBuffer(code);
  });
}

/**
 * @private
 * @param {Number|String} value
 * @param {Number} maxBytes
 * @return {Buffer}
 * @throws {Error} If the specified value is not a number.
 * @throws {Error} If the specified numeric value is outside of bounds.
 */
function prepareNumericValue(value, maxBytes)
{
  value = parseInt(value);

  if (maxBytes === 2 && (value < 0 || value > 0xFFFF))
  {
    throw new Error(util.format(
      "Expected a number between `0` and `0xFFFF`, got `%s`.", value
    ));
  }

  if (maxBytes === 4 && (value < 0 || value > 0xFFFFFFFF))
  {
    throw new Error(util.format(
      "Expected a number between `0` and `0xFFFFFFFF`, got `%s`.", value
    ));
  }

  return helpers.createNumericValueBuffer(value);
}

/**
 * @private
 * @param {String|Number|Array.<Number>} value
 * @param {Number} minLength
 * @return {Buffer}
 * @throws {Error} If the specified value is not a Buffer or cannot be used to create one.
 * @throws {Error} If the buffer's length is less than the specified minimum length.
 */
function prepareOpaqueValue(value, minLength)
{
  if (Array.isArray(value) && value.length)
  {
    value = value[value.length - 1];
  }

  var buffer = helpers.createValueBuffer(value);

  if (buffer.length < minLength || buffer.length > 8)
  {
    throw new Error(util.format(
      "Expected a buffer of length between %d and 8 bytes, got `%d` bytes",
      minLength,
      buffer.length
    ));
  }

  return buffer;
}

/**
 * @private
 * @param {String} value
 * @return {Array.<Buffer>}
 * @throws {Error} If the specified value is not a string.
 */
function prepareStringValue(value)
{
  if (typeof value !== 'string')
  {
    throw new Error(util.format(
      "Expected a string, got `%s`.", typeof value
    ));
  }

  return splitLongStringValue([], value);
}

/**
 * @private
 * @param {String|Array.<String>} value
 * @param {String} separator
 * @return {Array.<Buffer>}
 * @throws {Error} If the specified value is not a string or an array of strings.
 */
function prepareMultiStringValue(value, separator)
{
  var values = [];

  if (Array.isArray(value))
  {
    value.forEach(function(string)
    {
      splitLongStringValue(values, string);
    });

    return values;
  }

  if (typeof value !== 'string')
  {
    throw new Error(util.format(
      "Expected a string or an array of strings, got `%s`.", typeof value
    ));
  }

  value.split(separator).forEach(function(string)
  {
    splitLongStringValue(values, string);
  });

  if (values[0].length === 0)
  {
    values.shift();
  }

  return values;
}

/**
 * @private
 * @param {Array.<Buffer>} values
 * @param {String} string
 * @return {Array.<Buffer>}
 */
function splitLongStringValue(values, string)
{
  var byteLength = Buffer.byteLength(string);

  if (byteLength <= 270)
  {
    values.push(new Buffer(string));
  }
  else
  {
    var buffer = new Buffer(string);

    for (var start = 0; start < byteLength; start += 270)
    {
      var end = start + 270;

      values.push(buffer.slice(start, end > byteLength ? byteLength : end));
    }
  }

  return values;
}
