
const BaseAPI = require('easy-mcp-server/base-api');
class AdminAPI extends BaseAPI {
  process(req, res) {
    res.json({ admin: true, user: req.user });
  }
}
module.exports = AdminAPI;