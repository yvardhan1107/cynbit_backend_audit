const { makeRequest } = require('./mockClient');

function createTestServer() {
  return {
    start: async () => 'http://127.0.0.1:mock',
    stop: async () => {},
    request: async (baseUrl, path, options = {}) => {
      const { method = 'GET', headers = {}, body } = options;
      return makeRequest(method, path, { headers, body });
    },
  };
}

module.exports = { createTestServer, makeRequest };
