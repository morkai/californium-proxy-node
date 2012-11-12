# node.js to Californium over TCP proxy

A node.js client to the
[californium-proxy-java](https://github.com/morkai/californium-proxy-java)
Java server.

# License

This project is released under the [MIT License](http://opensource.org/licenses/mit-license.php).

## Requirements

### node.js

Version 0.8.0 or later available at [nodejs.org](http://nodejs.org/download/).

### californium-proxy-java

A proxy server this client will connect to.
Available at [californium-proxy-java](https://github.com/morkai/californium-proxy-java).

## Usage

Run the proxy server:
```
java -jar cf-proxy.jar --port 1337 --log ALL
```

Write a node.js program using the `Proxy` class.
```
var net = require('net');
var Proxy = require('californium-proxy').Proxy;

// Connect to the proxy server
var socket = net.connect(1337);

// Create the proxy client
var proxy = new Proxy(socket);

socket.on('connect', function()
{
  // Send non-confirmable GET request to coap://vs0.inf.ethz.ch/.well-known/core
  proxy.request({
    type: 'non',
    code: 'get',
    options: {
      proxyUri: 'coap://vs0.inf.ethz.ch',
      uriPath: '/.well-known/core'
    }
  })
  // Handle the response
  .on('response', function(res)
  {
    console.log(res.getPayload().toString());
  });
});
```

## API

### `Proxy`

#### `new Proxy(socket)`

Creates a new instance of the proxy client.

  - `socket` - an instance of the `net.Socket`.

#### `destroy() : void`

Destroys an instance of the proxy client. The associated socket
is not destroyed (it must be closed separately).

#### `request(message) : Message`

Sends the specified request message to the proxy server, which
in turn forwards it to the CoAP node and returns the response
(or responses in case of an observe request).

  - `message` - an instance of the `Message` or an options object
    passed to `Message.fromObject()`.

### `Message`

#### Events

`Message` class is an `EventEmitter` and emits the following events:

  - `response` - when a response to a request was received.
    `this` refers to the request `Message` the response belongs to.
    First argument is an instance of the response `Message`.
  - `error` - when there was an error during sending the request
    to the proxy or parsing the received response to the request.
    `this` refers to the request `Message` the error belongs to.
    First argument is an instance of `Error`.
  - `cancelled` - when the observer was cancelled.
    `this` refers to the request `Message` that was cancelled.

#### `Message.fromObject(obj) : Message`

A convenience named constructor used to build a `Message` from
an object. The following properties are supported:

  - `type` - a required CoAP message type (`con`, `non`),
  - `code` - a required CoAP message code (`get`, `put`, `post`, `delete`),
  - `id` - an optional CoAP message ID,
  - `options` - an optional object of CoAP options (all option
    names can be found in `lib/optionRegistry.js`),
  - `payload` - a payload of the CoAP message (see `setPayload()`).

#### `new Message(type, code)`

Creates a new instance of the CoAP message. Call any setter
methods to further configure the CoAP request.

  - `type` - a number or string representing the CoAP message type,
  - `code` - a number or string representing the CoAP message code.

#### `getType() : Number`

Returns the [message type](http://tools.ietf.org/html/draft-ietf-core-coap-08#section-4.4):

  - `Message.CON` - confirmable message,
  - `Message.NON` - non-confirmable message,
  - `Message.ACK` - acknowledgement,
  - `Message.RST` - reset message.

#### `getTypeString() : String`

Returns the message type as a string:

  - `"CON"` - confirmable message,
  - `"NON"` - non-confirmable message,
  - `"ACK"` - acknowledgement,
  - `"RST"` - reset message.

#### `getCode() : Number`

Returns the [message code](http://tools.ietf.org/html/draft-ietf-core-coap-08#section-11.1).

#### `getId() : Number`

Returns the message ID.

#### `setId(id) : Message`

Sets the message ID.

#### `isConfirmable() : Boolean`

Returns `TRUE` if the message is of type `CON`; otherwise `FALSE`.

#### `isNonConfirmable() : Boolean`

Returns `TRUE` if the message is of type `NON`; otherwise `FALSE`.

#### `isAcknowledgement() : Boolean`

Returns `TRUE` if the message is of type `ACK`; otherwise `FALSE`.

#### `isReset() : Boolean`

Returns `TRUE` if the message is of type `RST`; otherwise `FALSE`.

#### `isEmpty() : Boolean`

Returns `TRUE` if the message is empty (i.e. the message code
is equal to `0`); otherwise `FALSE`.

#### `isRequest() : Boolean`

Returns `TRUE` if the message is a request (i.e. the message code
is `GET`, `POST`, `PUT` or `DELETE`); otherwise `FALSE`.

#### `isResponse() : Boolean`

Returns `TRUE` if the message is a response (i.e. the message code
is between `64` and `191`); otherwise `FALSE`.

#### `isReply() : Boolean`

Returns `TRUE` if the message is a reply (i.e. it's empty
or an acknowledgement); otherwise `FALSE`.

#### `hasAnyOptions() : Boolean`

Returns `TRUE` if the message has any options; otherwise `FALSE`.

#### `hasOption(optionNumber) : Boolean`

Returns `TRUE` if the message has any options with number
equal to the specified `optionNumber`.

#### `getOptions(optionNumber) : Array.<Option>`

Returns an array of all options with number equal to
the specified `optionNumber`.

#### `setOptions(optionOrOptions) : Message`

Sets the specified option or an array of options with
the same option number.

Any options with the same option number added prior to a call
to this method are removed.

  - `optionOrOptions` - an instance of `Option` or an array
    of `Option` objects with the same option number.


#### `addOptions(optionOrOptions) : Message`

Adds the specified option or an array of options with
the same option number.

  - `optionOrOptions` - an instance of `Option` or an array
    of `Option` objects with the same option number.

#### `removeOption(optionNumber) : Message`

Removes all options with the specified option number.

#### `getFirstOption(optionNumber) : ?Option`

Returns the first option with the specified option number
or `NULL`.

#### `getOptionValues(optionNumber) : Array`

Returns an array of values of all options with the specified
option number.

#### `getFirstOptionValue(optionNumber) : Array`

Returns a value of the first option with the specified
option number.

#### `getAllOptionsList() : Array.<Option>`

Returns an ordered list of all options.

#### `getToken() : String`

Returns a string representation of the `Token` option.

#### `setToken(token) : String`

Sets a value of the Token option.
If the specified `token` is equal to `NULL`, `undefined`
or an empty string, then the token option is removed.

#### `getContentType() : Number`

Returns a value of the `Content-Type` option or `-1` if
the message does not have one.

#### `setContentType(contentType) : Message`

Sets the `Content-Type` option to the specified value.

  - `contentType` - a number or string identifying a media
    type from the `mediaTypeRegistry`.

#### `hasPayload() : Boolean`

Returns `TRUE` if the message has a payload; otherwise `FALSE`.

#### `getPayload() : Buffer`

Returns the message payload as a `Buffer`.
If the message has no payload, an empty `Buffer` is returned.

#### `setPayload(payload, [contentType]) : Message`

Sets the message payload and optionally, the `Content-Type` option
to the specified values.

  - `payload` - the new message payload, can be:

    - an instance of `Buffer`,
    - an array of bytes (numbers in range 0x00-0xFF),
    - `NULL` or `undefined`, resulting in an empty `Buffer`,
    - a number, resulting in a variable length `Buffer`,
    - a string, resulting in a variable length `Buffer` created
      from that string using the `UTF-8` encoding,
    - a boolean, resulting in a `Buffer` with one byte:
      `0` if `FALSE`, `1` if `TRUE`,
    - an object with `toBuffer()` function, which should return
      an instance of `Buffer`,
    - an object with `toString()` function (any object) as
      a fallback case.

#### `appendPayload(block) : Message`

Appends the specified block to the message payload.

  - `block` - an instance of `Buffer`.

#### `getProxyUri() : String`

Returns a value of the `Proxy-Uri` option as a string.

#### `setProxyUri(proxyUri) : Message`

Sets a value of the `Proxy-Uri` option.

  - `proxyUri` - a string.

#### `getUriPath() : String`

Returns a value of the `Uri-Path` option as an URL-encoded string.
If there are multiple options, they're joined with a `/` character.

#### `setUriPath(uriPath) : Message`

Sets a value of the `Uri-Path` option(s).

One option is added for each part separated by the `/` character
(e.g. for `/.well-known/core`, two options will be added:
`.well-known` and `core`).

  - `uriPath` - an URL-encoded string.

#### `getUriQuery() : String`

Returns a value of the `Uri-Query` option as an URL-encoded string.
If there are multiple options, they're joined with a `&` character.

#### `setUriQuery(uriQuery) : Message`

Sets a value of the `Uri-Query` option(s).

If the specified value is a string, then one option is added
for each part separated by the `&` character (e.g. for
`a=1&b=2&c=3`, three options will be added:
`a=1`, `b=2` and `c=3`).

If the specified value is an object, then one option is added
for each property (e.g. for `{a: '1', b: '2', c: '3'}`, three
options will be added: `a=1`, `b=2` and `c=3`).

#### `cancel() : void`

Cancels the observer relationship established by this request
(if any).

### `mediaTypeRegistry`

Used to identify media types used as values for `Accept`
and `Content-Type` options. Initial registry is very small
and contains only the following media types (`code`, `name` and
`extension`):

 - `0` `text/plain` `txt`,
 - `40` `application/link-format` `wlnk`,
 - `41` `application/xml` `xml`,
 - `42` `application/octet-stream` `bin`,
 - `47` `application/exi` `exi`,
 - `50` `application/json` `json`.

To add new media types use the `register()` function.

#### `register(code, name, extension) : void`

Adds a new media type to the registry.

  - `code` - a numeric code of the media type (e.g. `21`),
  - `name` - a name of the media type (e.g. `image/gif`),
  - `extension` - an extension used for files of that media type
    (e.g. 'gif').
