const http = require('http');
const { Socket } = require('net');
const app = require('../src/app');

function makeRequest(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', {
      value: '127.0.0.1',
      writable: true,
    });

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.ip = '127.0.0.1';

    // Headers
    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = v;
    }

    let bodyBuffer = null;
    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      bodyBuffer = Buffer.from(bodyStr);
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = bodyBuffer.length.toString();
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let responseData = '';
    res.write = function (chunk) {
      if (chunk) {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      return true;
    };

    res.end = function (chunk) {
      if (chunk) {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      res.emit('finish');

      let parsedBody = responseData;
      try {
        parsedBody = JSON.parse(responseData);
      } catch {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody,
      });
    };

    // Run Express middleware stack
    app(req, res);

    // Push request body
    if (bodyBuffer) {
      req.push(bodyBuffer);
    }
    req.push(null);
  });
}

module.exports = { makeRequest };
