const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Update user by ID
 * @summary Update a specific user
 * @param {string} id - User ID
 * @body {string} name - User name
 * @body {string} email - User email
 */
class UpdateUserById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    const { name, email } = req.body;
    
    res.json({
      success: true,
      message: `User ${id} updated successfully`,
      data: {
        id,
        name: name || 'Updated Name',
        email: email || 'updated@example.com',
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = UpdateUserById;

