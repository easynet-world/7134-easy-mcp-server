
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Hello World',
      timestamp: req.timestamp,
      user: req.user || null
    });
  }
}

module.exports = TestAPI;
