const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Create a new user in the system
 * @summary Create user
 * @tags users,user-management
 * @requestBody { "type": "object", "required": ["name"], "properties": { "name": { "type": "string", "minLength": 2 } } }
 * @responseSchema { "type": "object", "properties": { "message": { "type": "string" } } }
 */
class PostUsers extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    res.json({ message: `Hello ${name}!` });
  }
}

module.exports = PostUsers;
