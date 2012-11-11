var net = require('net');
var Proxy = require('../lib/Proxy');
var Message = require('../lib/Message');
var buffers = require('h5.buffers');

var CALIFORNIUM_PROXY_JAVA_PORT = 1337;

var socket = net.connect(CALIFORNIUM_PROXY_JAVA_PORT);

var proxy = new Proxy(socket);

socket.on('connect', function()
{
  var obs = proxy.request({
    type: 'non',
    code: 'get',
    options: {
      proxyUri: 'coap://vs0.inf.ethz.ch:5683',
      uriPath: '/timeResource',
      observe: 0
    }
  })
  .on('response', function(response)
  {
    console.log(response.toString());
  })
  .on('cancelled', function(type)
  {
    console.log('/timeResource observer cancelled!');
  })
  .on('error', function(err)
  {
    console.error('[ERROR] %s', err.message);
  });

  setTimeout(function() { obs.cancel(); }, 6000);

  setTimeout(function()
  {
    console.log('Destroying proxy & socket!');

    proxy.destroy();
    socket.destroy();
  }, 10000);
});
