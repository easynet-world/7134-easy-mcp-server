
const BaseAPI = require('easy-mcp-server/base-api');
class TestAPI extends BaseAPI {
  process(req, res) { res.json({ message: 'test' }); }
}
module.exports = TestAPI;
