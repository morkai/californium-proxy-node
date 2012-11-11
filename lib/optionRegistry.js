"use strict";

var util = require('util');

var FENCEPOST_DIVISOR = 14;

var optionRegistry = {};

/**
 * Map of option numbers to their names.
 */
var numberMap = {
  1 : {name: 'contentType'  , string: 'Content-Type'},
  2 : {name: 'maxAge'       , string: 'Max-Age'},
  3 : {name: 'proxyUri'     , string: 'Proxy-Uri'},
  4 : {name: 'eTag'         , string: 'ETag'},
  5 : {name: 'uriHost'      , string: 'Uri-Host'},
  6 : {name: 'locationPath' , string: 'Location-Path'},
  7 : {name: 'uriPort'      , string: 'Uri-Port'},
  8 : {name: 'locationQuery', string: 'Location-Query'},
  9 : {name: 'uriPath'      , string: 'Uri-Path'},
  10: {name: 'observe'      , string: 'Observe'},
  11: {name: 'token'        , string: 'Token'},
  12: {name: 'accept'       , string: 'Accept'},
  13: {name: 'ifMatch'      , string: 'If-Match'},
  14: {name: 'maxOfe'       , string: 'Max-OFE'},
  15: {name: 'uriQuery'     , string: 'Uri-Query'},
  17: {name: 'block2'       , string: 'Block2'},
  19: {name: 'block1'       , string: 'Block1'},
  21: {name: 'ifNoneMatch'  , string: 'If-None-Match'}
};
var nameMap = {};

Object.keys(numberMap).forEach(function(number)
{
  var name = numberMap[number].name;

  optionRegistry[name] = nameMap[name] = parseInt(number);
});

/**
 * Option name to option number map.
 *
 * @type {Object.<String, Number>}
 */
optionRegistry.names = nameMap;

/**
 * List of supported option numbers.
 *
 * @type {Array.<Number>}
 */
optionRegistry.numbers = Object.keys(numberMap).map(Number);

/**
 * @param {Number|String} name
 * @return {Number}
 * @throws {Error}
 */
optionRegistry.getNumber = function(name)
{
  var number = parseInt(name);

  if (!isNaN(number))
  {
    if (!numberMap.hasOwnProperty(number))
    {
      throw new Error(util.format(
        "Unknown option number: %s", number
      ));
    }

    return number;
  }

  if (!nameMap.hasOwnProperty(name))
  {
    throw new Error(util.format(
      "Unknown option name: %s", name
    ));
  }

  return nameMap[name];
};

/**
 * @param {String|Number} number
 * @return {String}
 * @throws {Error}
 */
optionRegistry.getName = function(number)
{
  if (typeof number === 'string')
  {
    if (!nameMap.hasOwnProperty(number))
    {
      throw new Error(util.format(
        "Unknown option name: %s", number
      ));
    }

    return number;
  }

  if (!numberMap.hasOwnProperty(number))
  {
    throw new Error(util.format(
      "Unknown option number: %s", number
    ));
  }

  return numberMap[number].name;
};

/**
 * Determines whether an option is elective.
 *
 * An option is elective if its number is odd.
 *
 * @param {Number} optionNumber The option number.
 * @return {Boolean} `TRUE` if the specified option is elective, `FALSE` if it is critical.
 */
optionRegistry.isElective = function(optionNumber)
{
  return (optionNumber & 1) === 0;
};

/**
 * Determines whether an option is critical.
 *
 * An option is critical if its number is even.
 *
 * @param {Number} optionNumber The option number.
 * @return {Boolean} `TRUE` if the specified option is critical, `FALSE` if it is elective.
 */
optionRegistry.isCritical = function(optionNumber)
{
  return (optionNumber & 1) === 1;
};

/**
 * Determines whether an option is a fencepost.
 *
 * An option is a fencepost if its number is divisible by `14`.
 *
 * @param {Number} optionNumber The option number.
 * @return {Boolean} `TRUE` if the specified option is a fencepost, `FALSE` otherwise.
 */
optionRegistry.isFencepost = function(optionNumber)
{
  return optionNumber % FENCEPOST_DIVISOR === 0;
};

/**
 * Returns the next fencepost option number following the specified option number.
 *
 * @param {Number} optionNumber The option number.
 * @return {Number} The next fencepost option number following the specified option number.
 */
optionRegistry.getNextFencepost = function(optionNumber)
{
  var fencepost = FENCEPOST_DIVISOR;

  while (optionNumber > fencepost)
  {
    fencepost += FENCEPOST_DIVISOR;
  }

  return fencepost;
};

/**
 * Returns a string representation of the specified option number.
 *
 * @param {Number} optionNumber The option number.
 * @param {Buffer} [optionData] The option data.
 * @return {String} A string representation of the specified option number.
 */
optionRegistry.toString = function(optionNumber, optionData)
{
  var knownOption = optionNumber in numberMap;

  if (optionRegistry.isFencepost())
  {
    if (knownOption && optionData && optionData.length)
    {
      return numberMap[optionNumber].string;
    }

    return 'Fencepost';
  }

  if (knownOption)
  {
    return numberMap[optionNumber].string;
  }

  return 'Unknown option number: ' + optionNumber;
};

optionRegistry.contentType   = 1;
optionRegistry.maxAge        = 2;
optionRegistry.proxyUri      = 3;
optionRegistry.eTag          = 4;
optionRegistry.uriHost       = 5;
optionRegistry.locationPath  = 6;
optionRegistry.uriPort       = 7;
optionRegistry.locationQuery = 8;
optionRegistry.uriPath       = 9;
optionRegistry.observe       = 10;
optionRegistry.token         = 11;
optionRegistry.accept        = 12;
optionRegistry.ifMatch       = 13;
optionRegistry.maxOfe        = 14;
optionRegistry.uriQuery      = 15;
optionRegistry.block2        = 17;
optionRegistry.block1        = 19;
optionRegistry.ifNoneMatch   = 21;

module.exports = optionRegistry;
