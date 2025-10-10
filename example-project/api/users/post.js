const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Create a new user in the system
 * @summary Create user
 * @tags users,user-management
 * @requestBody { "type": "object", "properties": { "name": { "type": "string", "description": "User's name" } }, "required": ["name"] }
 * @response 200 {Object} Success response with greeting message
 * @responseExample {json} 200 Success
 * {
 *   "message": "Hello John!"
 * }
 */
class PostUsers extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    res.json({ message: `Hello ${name}!` });
  }
}

module.exports = PostUsers;
