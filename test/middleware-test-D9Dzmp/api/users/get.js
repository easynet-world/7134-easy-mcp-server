
const BaseAPI = require('easy-mcp-server/base-api');
class UsersAPI extends BaseAPI {
  process(req, res) {
    res.json({ users: [], user: req.user });
  }
}
module.exports = UsersAPI;