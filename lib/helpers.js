"use strict";

var util = require('util');
var url = require('url');
var Buffer = require('buffer').Buffer;

/**
 * @param {*} value
 * @return {Buffer}
 */
exports.createValueBuffer = function(value)
{
  if (Buffer.isBuffer(value))
  {
    return value;
  }

  if (Array.isArray(value))
  {
    return new Buffer(value);
  }

  if (value === undefined || value === null)
  {
    return new Buffer(0);
  }

  switch (typeof value)
  {
    case 'number':
      return exports.createNumericValueBuffer(value);

    case 'string':
      return new Buffer(value);

    case 'boolean':
      return new Buffer([value ? 1 : 0]);

    default:
    {
      if (typeof value.toBuffer === 'function')
      {
        return value.toBuffer();
      }
      else
      {
        return new Buffer(value.toString());
      }
    }
  }
};

/**
 * @param {Number} value
 * @return {Buffer}
 */
exports.createNumericValueBuffer = function(value)
{
  var buffer;

  if (Math.floor(value) !== value || value >= 0xFFFFFFFF)
  {
    buffer = new Buffer(8);
    buffer.writeDoubleBE(value, 0, true);
  }
  else if (value <= 0xFF)
  {
    buffer = new Buffer([value]);
  }
  else if (value <= 0xFFFF)
  {
    buffer = new Buffer(2);
    buffer.writeUInt16BE(value, 0, true);
  }
  else if (value <= 0xFFFFFF)
  {
    buffer = new Buffer([
      (0xFF0000 & value) >> 16,
      (0xFF00 & value) >> 8,
      0xFF & value
    ]);
  }
  else
  {
    buffer = new Buffer(4);
    buffer.writeUInt32BE(value, 0, true);
  }

  return buffer;
};

/**
 * @param {Buffer} buffer
 * @return {Number}
 */
exports.createNumberFromBuffer = function(buffer)
{
  var length = buffer.length;

  if (length === 0)
  {
    return 0;
  }

  if (length === 1)
  {
    return buffer[0];
  }

  if (length === 2)
  {
    return buffer.readUInt16BE(0);
  }

  if (length === 3)
  {
    return (buffer[1] << 8) | buffer[2] + (buffer[0] << 16 >>> 0);
  }

  if (length < 8)
  {
    return buffer.readUInt32BE(0);
  }

  return buffer.readDoubleBE(0);
};

/**
 * @param {String} uriString
 * @param {Boolean=true} [split]
 * @return {Object}
 */
exports.parseUri = function(uriString, split)
{
  if (typeof split === 'undefined')
  {
    split = true;
  }

  var result = {};
  var components = url.parse(uriString);

  switch ((components.protocol + '').toLowerCase())
  {
    case 'coap:':
      result.scheme = 'coap';
      break;

    case 'coaps:':
      result.scheme = 'coaps';
      break;

    default:
    {
      throw new Error(util.format(
        "Expected the URI protocol to be either `coap` or `coaps`, got: `%s`.",
        components.protocol
      ));
    }
  }

  if (components.hostname)
  {
    result.host = decodeURIComponent(components.hostname);
  }

  if (components.port)
  {
    result.port = parseInt(components.port);
  }

  if (components.pathname && components.pathname !== '/')
  {
    result.path = exports.parseUriPath(components.pathname);
  }

  if (components.query && components.query.length)
  {
    result.query = exports.parseUriQuery(components.query);
  }

  return result;
};

/**
 * @param {String} uriPathString
 * @return {Array.<String>}
 */
exports.parseUriPath = function(uriPathString)
{
  if (uriPathString.length === 0 || uriPathString === '/')
  {
    return '';
  }

  if (uriPathString[0] === '/')
  {
    uriPathString = uriPathString.substr(1);
  }

  return uriPathString.split('/').map(decodeURIComponent);
};

/**
 * @param {String} uriQueryString
 * @return {Array.<String>}
 */
exports.parseUriQuery = function(uriQueryString)
{
  return uriQueryString.split('&').map(decodeURIComponent);
};

exports.wordwrap = wordwrap;

function wordwrap (str, int_width, str_break, cut) {
  // Wraps buffer to selected number of characters using string break char
  //
  // version: 1109.2015
  // discuss at: http://phpjs.org/functions/wordwrap
  // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
  // +   improved by: Nick Callen
  // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Sakimori
  // +   bugfixed by: Michael Grier
  // *     example 1: wordwrap('Kevin van Zonneveld', 6, '|', true);
  // *     returns 1: 'Kevin |van |Zonnev|eld'
  // *     example 2: wordwrap('The quick brown fox jumped over the lazy dog.', 20, '\n');
  // *     returns 2: 'The quick brown fox \njumped over the lazy\n dog.'
  // *     example 3: wordwrap('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
  // *     returns 3: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod \ntempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim \nveniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea \ncommodo consequat.'
  // PHP Defaults
  var m = ((arguments.length >= 2) ? arguments[1] : 75);
  var b = ((arguments.length >= 3) ? arguments[2] : "\n");
  var c = ((arguments.length >= 4) ? arguments[3] : false);

  var i, j, l, s, r;

  str += '';

  if (m < 1) {
    return str;
  }

  for (i = -1, l = (r = str.split(/\r\n|\n|\r/)).length; ++i < l; r[i] += s) {
    for (s = r[i], r[i] = ""; s.length > m; r[i] += s.slice(0, j) + ((s = s.slice(j)).length ? b : "")) {
      j = c == 2 || (j = s.slice(0, m + 1).match(/\S*(\s)?$/))[1] ? m : j.input.length - j[0].length || c == 1 && m || j.input.length + (j = s.slice(m).match(/^\S*/)).input.length;
    }
  }

  return r.join("\n");
}
