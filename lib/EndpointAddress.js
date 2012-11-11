"use strict";

var constants = require('./constants');

/**
 * @constructor
 * @param {String} [address]
 * @param {Number} [port]
 * @param {Boolean} [secure]
 */
function EndpointAddress(address, port, secure)
{
  /**
   * @private
   * @type Boolean
   */
  this.local = arguments.length === 0;

  /**
   * @private
   * @type String
   */
  this.address = address || constants.DEFAULT_ADDRESS;

  /**
   * @private
   * @type Number
   */
  this.port = port || constants.DEFAULT_PORT;

  /**
   * @private
   * @type Boolean
   */
  this.secure = secure === true;
}

/**
 * @return {String}
 */
EndpointAddress.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @return {Number}
 */
EndpointAddress.prototype.getPort = function()
{
  return this.port;
};

/**
 * @return {Boolean}
 */
EndpointAddress.prototype.isSecure = function()
{
  return this.secure;
};

/**
 * @return {Boolean}
 */
EndpointAddress.prototype.isLocal = function()
{
  return this.local;
};

/**
 * @return {String}
 */
EndpointAddress.prototype.toString = function()
{
  if (this.address.indexOf(':') === -1)
  {
    return this.address + ':' + this.port;
  }
  else
  {
    return '[' + this.address + ']:' + this.port;
  }
};

module.exports = EndpointAddress;
