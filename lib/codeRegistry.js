"use strict";

var util = require('util');

var REQUEST_LOWER_BOUND = 1;
var REQUEST_UPPER_BOUND = 31;
var RESPONSE_LOWER_BOUND = 64;
var RESPONSE_UPPER_BOUND = 191;

var codeMap = {
  0  : {name: 'empty', string: 'Empty'},

  1  : {name: 'get'   , string: 'GET'},
  2  : {name: 'post'  , string: 'POST'},
  3  : {name: 'put'   , string: 'PUT'},
  4  : {name: 'delete', string: 'DELETE'},

  65 : {name: 'created'                , string: '2.01 Created'},
  66 : {name: 'deleted'                , string: '2.02 Deleted'},
  67 : {name: 'valid'                  , string: '2.03 Valid'},
  68 : {name: 'changed'                , string: '2.04 Changed'},
  69 : {name: 'content'                , string: '2.05 Content'},
  128: {name: 'badRequest'             , string: '4.00 Bad Request'},
  129: {name: 'unauthorized'           , string: '4.01 Unauthorized'},
  130: {name: 'badOption'              , string: '4.02 Bad Option'},
  131: {name: 'forbidden'              , string: '4.03 Forbidden'},
  132: {name: 'notFound'               , string: '4.04 Not Found'},
  133: {name: 'methodNotAllowed'       , string: '4.05 Method Not Allowed'},
  134: {name: 'notAcceptable'          , string: '4.06 Not Acceptable'},
  136: {name: 'requestEntityIncomplete', string: '4.08 Request Entity Incomplete'},
  140: {name: 'preconditionFailed'     , string: '4.12 Precondition Failed'},
  141: {name: 'requestEntityTooLarge'  , string: '4.13 Request Entity Too Large'},
  143: {name: 'unsupportedMediaType'   , string: '4.15 Unsupported Media Type'},
  160: {name: 'internalServerError'    , string: '5.00 Internal Server Error'},
  161: {name: 'notImplemented'         , string: '5.01 Not Implemented'},
  162: {name: 'badGateway'             , string: '5.02 Bad Gateway'},
  163: {name: 'serviceUnavailable'     , string: '5.03 Service Unavailable'},
  164: {name: 'gatewayTimeout'         , string: '5.04 Gateway Timeout'},
  165: {name: 'proxyingNotSupported'   , string: '5.05 Proxying Not Supported'}
};
var nameMap = {};

Object.keys(codeMap).forEach(function(code)
{
  var name = codeMap[code].name;

  exports[name] = nameMap[name] = parseInt(code);
});

/**
 * @param {Number|String} name
 * @return {Number}
 * @throws {Error}
 */
exports.getCode = function(name)
{
  var code = parseInt(name);

  if (!isNaN(code))
  {
    if (!codeMap.hasOwnProperty(code))
    {
      throw new Error(util.format(
        "Unknown message code: %s", code
      ));
    }

    return code;
  }

  if (!nameMap.hasOwnProperty(name))
  {
    throw new Error(util.format(
      "Unknown message code name: %s", name
    ));
  }

  return nameMap[name];
};

/**
 * @param {String|Number} code
 * @return {String}
 * @throws {Error}
 */
exports.getName = function(code)
{
  if (typeof code === 'string')
  {
    if (!nameMap.hasOwnProperty(code))
    {
      throw new Error(util.format(
        "Unknown message code name: %s", code
      ));
    }

    return code;
  }

  if (!codeMap.hasOwnProperty(code))
  {
    throw new Error(util.format(
      "Unknown message code: %s", code
    ));
  }

  return codeMap[code].name;
};

/**
 * @param {Number} code
 * @return {Boolean}
 */
exports.isRequest = function(code)
{
  return code >= REQUEST_LOWER_BOUND && code <= REQUEST_UPPER_BOUND;
};

/**
 * @param {Number} code
 * @return {Boolean}
 */
exports.isResponse = function(code)
{
  return code >= RESPONSE_LOWER_BOUND && code <= RESPONSE_UPPER_BOUND;
};

/**
 * @param {Number} code
 * @return {String}
 */
exports.toString = function(code)
{
  if (codeMap.hasOwnProperty(code))
  {
    return codeMap[code].string;
  }

  return 'Unknown code: ' + code;
};

exports.empty                   = 0;
exports.get                     = 1;
exports.post                    = 2;
exports.put                     = 3;
exports.delete                  = 4;
exports.created                 = 65;
exports.deleted                 = 66;
exports.valid                   = 67;
exports.changed                 = 68;
exports.content                 = 69;
exports.badRequest              = 128;
exports.unauthorized            = 129;
exports.badOption               = 130;
exports.forbidden               = 131;
exports.notFound                = 132;
exports.methodNotAllowed        = 133;
exports.notAcceptable           = 134;
exports.requestEntityIncomplete = 136;
exports.preconditionFailed      = 140;
exports.requestEntityTooLarge   = 141;
exports.unsupportedMediaType    = 143;
exports.internalServerError     = 160;
exports.notImplemented          = 161;
exports.badGateway              = 162;
exports.serviceUnavailable      = 163;
exports.gatewayTimeout          = 164;
exports.proxyingNotSupported    = 165;
