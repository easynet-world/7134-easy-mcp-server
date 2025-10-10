const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all users in the system
 * @summary Retrieve user list
 * @tags users,data-access
 * @response 200 {Object} Success response with user data
 * @responseExample {json} 200 Success
 * {
 *   "users": ["John", "Jane", "Bob"]
 * }
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: ['John', 'Jane', 'Bob'] });
  }
}

module.exports = GetUsers;
