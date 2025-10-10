const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all users in the system
 * @summary Retrieve user list
 * @tags users,data-access
 * @responseSchema { "type": "object", "properties": { "users": { "type": "array", "items": { "type": "string" } } } }
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: ['John', 'Jane', 'Bob'] });
  }
}

module.exports = GetUsers;
