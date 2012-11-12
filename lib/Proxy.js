var BufferQueueReader = require('h5.buffers').BufferQueueReader;
var codeRegistry = require('./codeRegistry');
var optionRegistry = require('./optionRegistry');
var Message = require('./Message');

/**
 * @constructor
 * @param {Socket} socket
 */
function Proxy(socket)
{
  /**
   * @private
   * @type {Function}
   */
  this.onSocketData = this.onSocketData.bind(this);

  /**
   * @private
   * @type {Function}
   */
  this.onSocketClose = this.onSocketClose.bind(this);

  /**
   * @private
   * @type {Function}
   */
  this.handleReaderData = this.handleReaderData.bind(this);

  /**
   * @private
   * @type {Number}
   */
  this.packetId = 0;

  /**
   * @private
   * @type {Socket}
   */
  this.socket = socket;
  this.socket.on('data', this.onSocketData);

  /**
   * @private
   * @type {BufferQueueReader}
   */
  this.reader = new BufferQueueReader();

  /**
   * @private
   * @type {Number}
   */
  this.currentFrameLength = 0;

  /**
   * @private
   * @type {Object.<String, Message>}
   */
  this.requests = {};

  /**
   * @private
   * @type {Object.<String, String>}
   */
  this.observers = {};
}

Proxy.prototype.destroy = function()
{
  this.socket.removeListener('data', this.onSocketData);
  this.socket.removeListener('close', this.onSocketClose);
  this.socket = null;

  this.reader.skip(this.reader.length);
  this.reader = null;

  this.requests = null;
  this.observers = null;
};

/**
 * @param {Message|Object} message
 * @return {Message}
 */
Proxy.prototype.request = function(message)
{
  var request = Message.fromObject(message);
  var requestFrame = request.toBuffer();
  var requestId = this.getNextPacketId();
  var packet = new Buffer(6 + requestFrame.length);

  packet.writeUInt32BE(2 + requestFrame.length, 0);
  packet.writeUInt16BE(requestId, 4);
  requestFrame.copy(packet, 6);

  var proxy = this;
  var internal = arguments[1] === true;

  try
  {
    this.socket.write(packet, function()
    {
      proxy.requests[requestId] = request;

      if (!internal)
      {
        proxy.manageObserver(requestId, request);
      }
    });
  }
  catch (err)
  {
    request.emit('error', err);
  }

  return request;
};

/**
 * @private
 * @return {Number}
 */
Proxy.prototype.getNextPacketId = function()
{
  this.packetId += 1;

  if (this.packetId > 0xFFFF)
  {
    this.packetId = 1;
  }

  return this.packetId;
};

/**
 * @private
 * @param {Number} requestId
 * @param {Message} request
 */
Proxy.prototype.manageObserver = function(requestId, request)
{
  if (request.getCode() !== codeRegistry.get)
  {
    return;
  }

  if (request.hasOption(optionRegistry.observe))
  {
    this.addObserver(requestId, request);
  }
  else
  {
    this.removeObserver(request.getUri());
  }
};

/**
 * @private
 * @param {Number} requestId
 * @param {Message} observer
 */
Proxy.prototype.addObserver = function(requestId, observer)
{
  var uri = observer.getUri();

  this.observers[uri] = requestId;

  var proxy = this;

  observer.cancel(function()
  {
    var request = this;

    if (request.cancelledObserver || request.cancellingObserver)
    {
      return;
    }

    request.cancellingObserver = true;

    var cancelRequest = new Message(Message.NON, codeRegistry.get);

    cancelRequest.setUri(uri);
    cancelRequest.setOption(request.getOptions(optionRegistry.proxyUri));
    cancelRequest.on('response', function(response)
    {
      request.cancellingObserver = false;

      if (response.isResponse()
        && response.getCode() < codeRegistry.badRequest)
      {
        request.cancelledObserver = true;

        if (proxy.observers[uri] === requestId)
        {
          delete proxy.observers[uri];
        }

        delete proxy.requests[requestId];

        request.emit('cancelled');
      }
    });

    proxy.request(cancelRequest, true);
  });
};

/**
 * @private
 * @param {String} uri
 */
Proxy.prototype.removeObserver = function(uri)
{
  var observerId = this.observers[uri];

  if (typeof observerId !== 'undefined')
  {
    delete this.observers[uri];

    var observer = this.requests[observerId];

    if (typeof observer !== 'undefined')
    {
      delete this.requests[observerId];

      observer.emit('cancelled');
    }
  }
};

/**
 * @private
 */
Proxy.prototype.onSocketClose = function()
{
  this.reader.skip(this.reader.length);

  this.requests = {};
  this.observers = {};
};

/**
 * @private
 * @param {Buffer} data
 */
Proxy.prototype.onSocketData = function(data)
{
  this.reader.push(data);

  this.handleReaderData();
};

/**
 * @private
 */
Proxy.prototype.handleReaderData = function()
{
  if (this.reader === null)
  {
    return;
  }

  if (this.currentFrameLength === 0 && this.reader.length >= 4)
  {
    this.currentFrameLength = this.reader.shiftUInt32();
  }

  if (this.currentFrameLength < 6)
  {
    this.reader.skip(this.reader.length);

    this.currentFrameLength = 0;
  }
  else if (this.reader.length >= this.currentFrameLength)
  {
    var requestId = this.reader.shiftUInt16();

    if (requestId in this.requests)
    {
      var responseFrame = this.reader.shiftBuffer(this.currentFrameLength - 2);

      this.handleResponseFrame(requestId, responseFrame);
    }
    else
    {
      this.reader.skip(this.currentFrameLength - 2);
    }

    this.currentFrameLength = 0;

    if (this.reader.length > 0)
    {
      process.nextTick(this.handleReaderData);
    }
  }
};

/**
 * @private
 * @param {Number} requestId
 * @param {Buffer} responseFrame
 */
Proxy.prototype.handleResponseFrame = function(requestId, responseFrame)
{
  var request = this.requests[requestId];

  if (!request.hasOption(optionRegistry.observe))
  {
    delete this.requests[requestId];
  }

  try
  {
    var response = Message.fromBuffer(responseFrame);

    request.emit('response', response);
  }
  catch (err)
  {
    request.emit('error', err);
  }
};

module.exports = Proxy;
