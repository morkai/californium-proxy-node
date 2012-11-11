"use strict";

var util = require('util');
var buffers = require('h5.buffers');
var wordwrap = require('./helpers').wordwrap;
var codeRegistry = require('./codeRegistry');
var optionRegistry = require('./optionRegistry');
var Option = require('./Option');
var Message;

var END_OF_OPTIONS_MARKER = 240;

/**
 * @param {Message} message
 * @return {buffers.Buffer}
 */
exports.toBuffer = function(message)
{
  var builder;
  var optionCount;
  var optionsBuffer;

  if (message.hasAnyOptions())
  {
    builder = new buffers.BufferBuilder();
    optionCount =
      serializeOptionsToBuffer(message.getAllOptionsList(), builder);
    optionsBuffer = builder.toBuffer();
  }
  else
  {
    optionCount = 0;
  }

  builder = new buffers.BufferBuilder();

  builder.pushByte(64 | (message.getType() << 4) | optionCount);
  builder.pushByte(message.getCode());
  builder.pushUInt16(message.getId());

  if (optionsBuffer)
  {
    builder.pushBuffer(optionsBuffer);
  }

  if (message.hasPayload())
  {
    builder.pushBuffer(message.getPayload());
  }

  return builder.toBuffer();
};

/**
 * @param {buffers.Buffer} buffer
 * @return {Message}
 */
exports.fromBuffer = function(buffer)
{
  loadMessageClasses();

  var code = buffer[1];
  var message = createMessage((buffer[0] & 48) >> 4, code);

  if (code !== 0 && buffer.length > 4)
  {
    var reader = new buffers.BufferReader(buffer);

    reader.skip(4);

    deserializeBufferToOptions(reader, buffer[0] & 15, message);

    if (reader.length > 0)
    {
      message.setPayload(reader.readBuffer(0, reader.length));
    }
  }

  return message.setId(buffer.readUInt16BE(2));
};

/**
 * @param {Message} message
 * @return {String}
 */
exports.toString = function(message)
{
  var klass = message.isRequest()
    ? 'Request' : message.isResponse() ? 'Response' : 'Message';

  var optionList = message.getAllOptionsList();
  var optionCount = optionList.length;
  var optionsStr = '';

  optionList.forEach(function(option)
  {
    optionsStr += '\n  - ' + option;
  });

  var payload = message.getPayload();
  var payloadStr = '';

  if (payload.length)
  {
    payloadStr += '\n---------------------------------------------'
      + '----------------------------------\n';

    switch (message.getContentType())
    {
      case 0:
      case 40:
      case 41:
      case 50:
        payloadStr += payload.toString();
        break;

      default:
        payloadStr += util.inspect(payload);
        break;
    }
  }

  var endpointStr = message.getPeerAddress().toString();

  var str = [
    "CoAP %s",
    "-------------------------------------------------------------------------------",
    "%s",
    "-------------------------------------------------------------------------------",
    "Endpoint: %s",
    "ID      : %d",
    "Type    : %s",
    "Code    : %s",
    "Options : %d%s",
    "Payload : %d bytes%s",
    "==============================================================================="
  ];

  return util.format(
    str.join('\n'),
    klass,
    wordwrap(util.inspect(message.toBuffer()), 78),
    endpointStr,
    message.getId(),
    message.getTypeString(),
    codeRegistry.toString(message.getCode()),
    optionCount,
    optionsStr,
    payload.length,
    wordwrap(payloadStr, 78)
  );
};

/**
 * @param {Message} message
 * @return {Object}
 */
exports.toObject = function(message)
{
  var messageObj = {
    type: message.getType(),
    code: message.getCode(),
    id: message.getId(),
    options: {},
    payload: Array.prototype.slice.call(message.getPayload())
  };

  message.getAllOptionsList().forEach(function(option)
  {
    var name = optionRegistry.getName(option.getNumber());

    if (name in messageObj.options)
    {
      messageObj.options[name].push(option.getValue());
    }
    else
    {
      messageObj.options[name] = [option.getValue()];
    }
  });

  if (message.hasPayload())
  {
    messageObj.payload = message.getPayload();
  }

  return messageObj;
};

/**
 * @param {Object} messageObj
 * @return {Message}
 */
exports.fromObject = function(messageObj)
{
  loadMessageClasses();

  if (messageObj instanceof Message)
  {
    return messageObj;
  }

  var message = createMessage(messageObj.type, messageObj.code);

  if (typeof messageObj.id !== 'undefined')
  {
    message.setId(messageObj.id);
  }

  if (typeof messageObj.options !== 'undefined')
  {
    for (var optionName in messageObj.options)
    {
      message.addOption(Option.fromValue(
        optionRegistry.getNumber(optionName), messageObj.options[optionName]
      ));
    }
  }

  if (typeof messageObj.payload !== 'undefined')
  {
    message.setPayload(messageObj.payload);
  }

  return message;
};

/**
 * @private
 * @param {Array.<Option>} optionList
 * @param {BufferBuilder} builder
 * @return {Number}
 */
function serializeOptionsToBuffer(optionList, builder)
{
  var optionCount = optionList.length;
  var lastOptionNumber = 0;

  for (var i = 0, l = optionList.length; i < l; ++i)
  {
    var option = optionList[i];
    var optionNumber = option.getNumber();
    var optionData = option.getData();
    var optionLength = optionData.length;
    var optionDelta = optionNumber - lastOptionNumber;

    while (optionDelta > 15)
    {
      var fencepostNumber = optionRegistry.getNextFencepost(lastOptionNumber);
      var fencepostDelta = fencepostNumber - lastOptionNumber;

      lastOptionNumber = fencepostNumber;

      builder.pushByte(fencepostDelta << 4);

      lastOptionNumber = fencepostNumber;
      optionDelta -= fencepostDelta;
      optionCount += 1;
    }

    if (optionLength > 14)
    {
      builder
        .pushByte((optionDelta << 4) | 15)
        .pushByte(optionLength - 15);
    }
    else
    {
      builder.pushByte((optionDelta << 4) | optionLength);
    }

    if (optionLength > 0)
    {
      builder.pushBuffer(optionData);
    }

    lastOptionNumber = optionNumber;
  }

  if (optionCount >= 15)
  {
    builder.pushByte(END_OF_OPTIONS_MARKER);

    optionCount = 15;
  }

  return optionCount;
}

/**
 * @private
 * @param {BufferReader} reader
 * @param {Number} optionCount
 * @param {Message} message
 */
function deserializeBufferToOptions(reader, optionCount, message)
{
  var unlimitedOptions = optionCount === 15;
  var lastOptionNumber = 0;

  while (unlimitedOptions || optionCount--)
  {
    var metaByte = reader.shiftByte();

    if (unlimitedOptions && metaByte === END_OF_OPTIONS_MARKER)
    {
      break;
    }

    var optionDelta = metaByte >> 4;
    var optionLength = metaByte & 15;

    if (optionLength === 15)
    {
      optionLength += reader.shiftByte();
    }

    var optionNumber = lastOptionNumber + optionDelta;
    var optionData = optionLength ? reader.shiftBuffer(optionLength) : null;

    message.addOption(Option.fromNumber(optionNumber, optionData));

    lastOptionNumber = optionNumber;
  }
}

/**
 * @private
 * @param {Number} type
 * @param {Number} code
 * @return {Message}
 */
function createMessage(type, code)
{
  return new Message(type, code);
}

/**
 * @private
 * @type Boolean
 */
var messageClassesLoaded = false;

/**
 * @private
 */
function loadMessageClasses()
{
  if (messageClassesLoaded === false)
  {
    Message = require('./Message');

    messageClassesLoaded = true;
  }
}
