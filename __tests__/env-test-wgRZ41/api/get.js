
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Test API',
      envVar: process.env.TEST_VAR,
      port: process.env.EASY_MCP_SERVER_PORT 
    });
  }
}

module.exports = TestAPI;
