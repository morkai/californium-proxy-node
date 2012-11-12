"use strict";

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var BufferQueueReader = require('h5.buffers').BufferQueueReader;
var Buffer = require('buffer').Buffer;
var helpers = require('./helpers');
var constants = require('./constants');
var codeRegistry = require('./codeRegistry');
var optionRegistry = require('./optionRegistry');
var Option = require('./Option');
var EndpointAddress = require('./EndpointAddress');
var messageSerializer = require('./messageSerializer');

/**
 * @constructor
 * @param {String|Number} type
 * @param {String|Number} code
 * @throws {Error} If the specified type is not a valid CoAP message type.
 * @throws {Error} If the specified code is not a valid CoAP message code.
 */
function Message(type, code)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type Number
   */
  this.type = Message.getType(type);

  /**
   * @private
   * @type Number
   */
  this.code = codeRegistry.getCode(code);

  /**
   * @private
   * @type Number
   */
  this.id = 0;

  /**
   * @private
   * @type Object.<Number, Array.<Option>>
   */
  this.options = {};

  /**
   * @private
   * @type ?Buffer
   */
  this.payload = null;

  /**
   * @private
   * @type ?EndpointAddress
   */
  this.peerAddress = null;

  /**
   * @internal
   * @type {Boolean}
   */
  this.cancellingObserver = false;

  /**
   * @internal
   * @type {Boolean}
   */
  this.cancelledObserver = false;

  /**
   * @private
   * @type {?Function}
   */
  this.cancelObserver = null;
}

util.inherits(Message, EventEmitter);

Message.CON = 0;
Message.NON = 1;
Message.ACK = 2;
Message.RST = 3;

/**
 * @param {Buffer} buffer
 * @return {Message}
 */
Message.fromBuffer = function(buffer)
{
  return messageSerializer.fromBuffer(buffer);
};

/**
 * @param {Object} obj
 * @return {Message}
 */
Message.fromObject = function(obj)
{
  return messageSerializer.fromObject(obj);
};

/**
 * @param {Number|String} type
 * @return {Number}
 * @throws {Error} If the specified type is not a valid CoAP message type.
 */
Message.getType = function(type)
{
  switch ((type + '').toUpperCase())
  {
    case '0':
    case 'CON':
      return Message.CON;

    case '1':
    case 'NON':
      return Message.NON;

    case '2':
    case 'ACK':
      return Message.ACK;

    case '3':
    case 'RST':
      return Message.RST;

    default:
    {
      throw new Error(util.format(
        "Unknown message type: %s", type
      ));
    }
  }
};

/**
 * @param {Number} type
 * @return {String}
 * @throws {Error} If the specified type is not a valid CoAP message type.
 */
Message.getTypeString = function(type)
{
  switch (type)
  {
    case Message.CON:
      return 'CON';

    case Message.NON:
      return 'NON';

    case Message.ACK:
      return 'ACK';

    case Message.RST:
      return 'RST';

    default:
      throw new Error(util.format(
        "Unknown message type: %s", type
      ));
  }
};

/**
 * @return {Number}
 */
Message.prototype.getType = function()
{
  return this.type;
};

/**
 * @return {String}
 */
Message.prototype.getTypeString = function()
{
  return Message.getTypeString(this.type);
}

/**
 * @return {Number}
 */
Message.prototype.getCode = function()
{
  return this.code;
};

/**
 * @return {Number}
 */
Message.prototype.getId = function()
{
  return this.id;
};

/**
 * @param {Number} id
 * @return {Message}
 */
Message.prototype.setId = function(id)
{
  this.id = id;

  return this;
};

/**
 * @return {Boolean}
 */
Message.prototype.isConfirmable = function()
{
  return this.type === Message.CON;
};

/**
 * @return {Boolean}
 */
Message.prototype.isNonConfirmable = function()
{
  return this.type === Message.NON;
};

/**
 * @return {Boolean}
 */
Message.prototype.isAcknowledgement = function()
{
  return this.type === Message.ACK;
};

/**
 * @return {Boolean}
 */
Message.prototype.isReset = function()
{
  return this.type === Message.RST;
};

/**
 * @return {Boolean}
 */
Message.prototype.isEmpty = function()
{
  return this.code === codeRegistry.empty;
};

/**
 * @return {Boolean}
 */
Message.prototype.isRequest = function()
{
  return codeRegistry.isRequest(this.code);
};

/**
 * @return {Boolean}
 */
Message.prototype.isResponse = function()
{
  return codeRegistry.isResponse(this.code);
};

/**
 * @return {Boolean}
 */
Message.prototype.isReply = function()
{
  return this.isAcknowledgement() || this.isReset();
};

/**
 * Determines whether this message has any options.
 *
 * @return {Boolean}
 */
Message.prototype.hasAnyOptions = function()
{
  for (var optionNumber in this.options)
  {
    return true;
  }

  return false;
};

/**
 * Determines whether this message has any options with the specified option
 * number.
 *
 * @param {Number} optionNumber
 * @return {Boolean}
 */
Message.prototype.hasOption = function(optionNumber)
{
  return optionNumber in this.options;
};

/**
 * Returns an array of options with the specified option number.
 *
 * @param {Number} optionNumber
 * @return {Array.<Option>}
 */
Message.prototype.getOptions = function(optionNumber)
{
  var list = this.options[optionNumber];

  return list ? list : [];
};

/**
 * Sets the specified option or an array of options with the same option number.
 *
 * Any options with the same option number added prior to a call to this method
 * are removed.
 *
 * @param {Option|Array.<Option>} optionOrOptions
 * @return {Message}
 */
Message.prototype.setOption = function(optionOrOptions)
{
  if (Array.isArray(optionOrOptions))
  {
    var options = [].concat(optionOrOptions);

    if (options.length > 0)
    {
      this.options[options[0].getNumber()] = options;
    }

    return this;
  }

  this.options[optionOrOptions.getNumber()] = [optionOrOptions];

  return this;
};

/**
 * Adds the specified option or an array of options with the same option number.
 *
 * @param {Option} optionOrOptions
 * @return {Message}
 */
Message.prototype.addOption = function(optionOrOptions)
{
  var number;

  if (Array.isArray(optionOrOptions))
  {
    if (optionOrOptions.length === 0)
    {
      return this;
    }

    number = optionOrOptions[0].getNumber();

    if (number in this.options)
    {
      this.options[number] = this.options[number].concat(optionOrOptions);
    }
    else
    {
      this.options[number] = [].concat(optionOrOptions);
    }

    return this;
  }

  number = optionOrOptions.getNumber();

  if (number in this.options)
  {
    this.options[number].push(optionOrOptions);
  }
  else
  {
    this.options[number] = [optionOrOptions];
  }

  return this;
};

/**
 * Removes all options with the specified option number.
 *
 * @param {Number} optionNumber
 * @return {Message}
 */
Message.prototype.removeOption = function(optionNumber)
{
  delete this.options[optionNumber];

  return this;
};

/**
 * Returns the first option with the specified option number.
 *
 * @param {Number} optionNumber
 * @return {?Option}
 */
Message.prototype.getFirstOption = function(optionNumber)
{
  var list = this.options[optionNumber];

  return list && list[0] ? list[0] : null;
};

/**
 * Returns an array of values of all options with the specified option number.
 *
 * @param {Number} optionNumber
 * @return {Array.<*>}
 */
Message.prototype.getOptionValues = function(optionNumber)
{
  var values = [];
  var options = this.options[optionNumber];

  if (options)
  {
    for (var i = 0, l = options.length; i < l; ++i)
    {
      values.push(options[i].getValue());
    }
  }

  return values;
};

/**
 * Returns a value of the first option with the specified option number.
 *
 * @param {Number} optionNumber
 * @return {*}
 */
Message.prototype.getFirstOptionValue = function(optionNumber)
{
  var options = this.options[optionNumber];

  return options && options[0] ? options[0].getValue() : null;
};

/**
 * Returns an ordered list of all options.
 *
 * @return {Array.<Option>}
 */
Message.prototype.getAllOptionsList = function()
{
  var optionList = [];
  var optionMap = this.options;
  var optionNumbers = optionRegistry.numbers;

  for (var i = 0, l = optionNumbers.length; i < l; ++i)
  {
    var options = optionMap[optionNumbers[i]];

    if (options)
    {
      optionList = optionList.concat(options);
    }
  }

  return optionList;
};

/**
 * Returns a string representation of the Token option.
 *
 * @return {String}
 */
Message.prototype.getToken = function()
{
  var token = this.getFirstOption(optionRegistry.token);

  return token ? token.getStringValue() : '';
};

/**
 * @param {*} token
 * @return
 */
Message.prototype.setToken = function(token)
{
  if (token === '' || token === null || typeof token === 'undefined')
  {
    this.removeOption(optionRegistry.token);
  }
  else
  {
    this.setOption(Option.fromValue(optionRegistry.token, token));
  }

  return this;
};

/**
 * @return {Number}
 */
Message.prototype.getContentType = function()
{
  var contentType = this.getFirstOptionValue(optionRegistry.contentType);

  return contentType === null ? -1 : contentType;
};

/**
 * @param {Number|String} contentType
 * @return {Message}
 */
Message.prototype.setContentType = function(contentType)
{
  this.setOption(Option.fromValue(optionRegistry.contentType, contentType));

  return this;
};

/**
 * @return {Boolean}
 */
Message.prototype.hasPayload = function()
{
  return this.payload && this.payload.length;
};

/**
 * @return {Buffer}
 */
Message.prototype.getPayload = function()
{
  return this.payload ? this.payload : new Buffer(0);
};

/**
 * @param {*} payload
 * @param {?Number|?String} [contentType]
 * @return {Message}
 */
Message.prototype.setPayload = function(payload, contentType)
{
  this.payload = helpers.createValueBuffer(payload);

  if (typeof contentType !== 'undefined')
  {
    this.setContentType(contentType);
  }

  return this;
};

/**
 * @param {Buffer} block
 * @return {Message}
 */
Message.prototype.appendPayload = function(block)
{
  if (!block || block.length === 0)
  {
    return this;
  }

  var oldPayload = this.payload;
  var newPayload;

  if (this.payload)
  {
    newPayload = new Buffer(oldPayload.length + block.length);

    oldPayload.copy(newPayload);
    block.copy(newPayload, oldPayload.length);
  }
  else
  {
    newPayload = block;
  }

  this.payload = newPayload;

  return this;
};

/**
 * @return {EndpointAddress}
 */
Message.prototype.getPeerAddress = function()
{
  return this.peerAddress ? this.peerAddress : new EndpointAddress();
};

/**
 * @param {EndpointAddress} peerAddress
 * @return {Message}
 */
Message.prototype.setPeerAddress = function(peerAddress)
{
  this.peerAddress = peerAddress;

  return this;
};

/**
 * @return {String}
 */
Message.prototype.getUri = function()
{
  var peerAddress = this.getPeerAddress();
  var url = peerAddress.isSecure() ? 'coaps://' : 'coap://';
  var host = this.getUriHost();

  if (host)
  {
    host = encodeURIComponent(host);
  }
  else
  {
    host = peerAddress.getAddress();
  }

  if (host.indexOf(':') !== -1)
  {
    host = '[' + host + ']';
  }

  url += host;

  var port = this.getUriPort() || peerAddress.getPort();

  if (port !== constants.DEFAULT_PORT)
  {
    url += ':' + port;
  }

  url += '/' + this.getUriPath();

  var uriQuery = this.getUriQuery();

  if (uriQuery.length > 0)
  {
    url += '?' + uriQuery;
  }

  return url;
};

/**
 * @param {String} uriString
 * @return {Message}
 */
Message.prototype.setUri = function(uriString)
{
  var uri = helpers.parseUri(uriString);

  if (typeof uri.host !== 'string')
  {
    throw new Error(util.format(
      "The specified URI does not have a host component: %s", uriString
    ));
  }

  var hasHost = typeof uri.host !== 'undefined';

  if (hasHost && this.peerAddress === null)
  {
    this.setPeerAddress(new EndpointAddress(uri.host, uri.port));
  }

  var endpoint = this.getPeerAddress();

  if (hasHost)
  {
    this.setUriHost(uri.host);
  }
  else if (uri.host !== endpoint.getAddress())
  {
    this.removeOption(optionRegistry.uriHost);
  }

  if (typeof uri.port === 'undefined')
  {
    this.removeOption(optionRegistry.uriHost);
  }
  else if (uri.port && uri.port !== endpoint.getPort())
  {
    this.setUriPort(uri.port);
  }

  if (typeof uri.path === 'undefined')
  {
    this.removeOption(optionRegistry.uriPath);
  }
  else
  {
    this.setOption(Option.fromValue(optionRegistry.uriPath, uri.path));
  }

  if (typeof uri.query === 'undefined')
  {
    this.removeOption(optionRegistry.uriQuery);
  }
  else
  {
    this.setOption(Option.fromValue(optionRegistry.uriQuery, uri.query));
  }

  return this;
};

/**
 * @return {?String}
 */
Message.prototype.getProxyUri = function()
{
  var options = this.getOptions(optionRegistry.proxyUri);
  var optionCount = options.length;

  if (optionCount === 0)
  {
    return null;
  }

  if (optionCount === 1)
  {
    return options[0].getValue();
  }

  var reader = new BufferQueueReader();

  for (var i = 0; i < optionCount; ++i)
  {
    reader.push(options[i].getData());
  }

  return reader.readString(0, reader.length, 'utf8');
};

/**
 * @param {String} proxyUri
 * @return {Message}
 */
Message.prototype.setProxyUri = function(proxyUri)
{
  this.setOption(Option.fromValue(optionRegistry.proxyUri, proxyUri));

  return this;
};

/**
 * @return {?String}
 */
Message.prototype.getUriHost = function()
{
  return this.getFirstOptionValue(optionRegistry.uriHost);
};

/**
 * @param {String} uriHost
 * @return {Message}
 */
Message.prototype.setUriHost = function(uriHost)
{
  this.setOption(Option.fromValue(optionRegistry.uriHost, uriHost));

  return this;
};

/**
 * @return {?Number}
 */
Message.prototype.getUriPort = function()
{
  return this.getFirstOptionValue(optionRegistry.uriPort);
};

/**
 * @param {Number} uriPort
 * @return {Message}
 */
Message.prototype.setUriPort = function(uriPort)
{
  if (uriPort === constants.DEFAULT_PORT)
  {
    this.removeOption(optionRegistry.uriPort);
  }
  else
  {
    this.setOption(Option.fromValue(optionRegistry.uriPort, uriPort));
  }

  return this;
};

/**
 * @return {String}
 */
Message.prototype.getUriPath = function()
{
  var uriPathOptions = this.getOptionValues(optionRegistry.uriPath);

  return uriPathOptions.map(encodeURIComponent).join('/');
};

/**
 * @param {String} uriPath
 * @return {Message}
 */
Message.prototype.setUriPath = function(uriPath)
{
  if (uriPath === '/')
  {
    this.removeOption(optionRegistry.uriPath);
  }
  else
  {
    this.setOption(
      Option.fromValue(optionRegistry.uriPath, helpers.parseUriPath(uriPath))
    );
  }

  return this;
};

/**
 * @return {String}
 */
Message.prototype.getUriQuery = function()
{
  var uriQueryOptions = this.getOptionValues(optionRegistry.uriQuery);

  return uriQueryOptions.map(function(uriQueryOption)
  {
    var valueIndex = uriQueryOption.indexOf('=');

    if (valueIndex === -1)
    {
      return uriQueryOption;
    }

    return uriQueryOption.substr(0, valueIndex)
      + '='
      + encodeURIComponent(uriQueryOption.substr(valueIndex + 1));
  }).join('&');
};

/**
 * @param {String|Object} uriQuery
 * @return {Message}
 */
Message.prototype.setUriQuery = function(uriQuery)
{
  if (typeof uriQuery === 'string')
  {
    uriQuery = helpers.parseUriQuery(uriQuery);

    if (uriQuery.length)
    {
      this.setOption(Option.fromValue(optionRegistry.uriQuery, uriQuery));
    }
    else
    {
      this.removeOption(optionRegistry.uriQuery);
    }
  }
  else
  {
    this.removeOption(optionRegistry.uriQuery);

    for (var key in uriQuery)
    {
      var optionValue = key + '=' + decodeURIComponent(uriQuery[key]);

      this.addOption(Option.fromValue(optionRegistry.uriQuery, optionValue));
    }
  }

  return this;
};

/**
 * @return {String}
 */
Message.prototype.toString = function()
{
  return messageSerializer.toString(this);
};

/**
 * @return {Buffer}
 */
Message.prototype.toBuffer = function()
{
  return messageSerializer.toBuffer(this);
};

/**
 * @return {Object}
 */
Message.prototype.toObject = function()
{
  return messageSerializer.toObject(this);
};

/**
 * @return {Object}
 */
Message.prototype.toJSON = function()
{
  return this.toObject();
};

/**
 * @param {Function} [cancelObserver]
 */
Message.prototype.cancel = function(cancelObserver)
{
  if (typeof cancelObserver === 'function')
  {
    this.cancelObserver = cancelObserver;
  }
  else if (typeof this.cancelObserver === 'function')
  {
    this.cancelObserver.call(this);
    this.cancelObserver = null;
  }
};

module.exports = Message;
