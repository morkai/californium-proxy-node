"use strict";

var mediaTypeRegistry = {};

var codeMap = {};
var nameMap = {};

mediaTypeRegistry.register = function(code, name, extension)
{
  codeMap[code] = {name: name, extension: extension};
  nameMap[name] = code;
  nameMap[extension] = code;
};

mediaTypeRegistry.register(0 , 'text/plain'              , 'txt');
mediaTypeRegistry.register(40, 'application/link-format' , 'wlnk');
mediaTypeRegistry.register(41, 'application/xml'         , 'xml');
mediaTypeRegistry.register(42, 'application/octet-stream', 'bin');
mediaTypeRegistry.register(47, 'application/exi'         , 'exi');
mediaTypeRegistry.register(50, 'application/json'        , 'json');

/**
 * @param {Number|String} type
 * @return {Number}
 * @throws {Error}
 */
mediaTypeRegistry.getCode = function(type)
{
  var code = parseInt(type);

  if (code >= 0 && code <= 0xFFFF)
  {
    return type;
  }

  if (type in nameMap)
  {
    return nameMap[type];
  }

  return -1;
};

/**
 * @param {Number|String} type
 * @return {String}
 * @throws {Error}
 */
mediaTypeRegistry.getName = function(type)
{
  if (type in codeMap)
  {
    return codeMap[type].name;
  }

  if (type in nameMap)
  {
    return codeMap[nameMap[type]].name;
  }

  return 'Unknown media type: ' + type;
};

/**
 * @param {Number|String} type
 * @return {String}
 * @throws {Error}
 */
mediaTypeRegistry.getExtension = function(type)
{
  if (type in codeMap)
  {
    return codeMap[type].extension;
  }

  if (type in nameMap)
  {
    return codeMap[nameMap[type]].extension;
  }

  return 'unknown';
};

module.exports = mediaTypeRegistry;
