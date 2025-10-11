const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Delete user by ID
 * @summary Delete a specific user
 * @param {string} id - User ID
 */
class DeleteUserById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    
    res.json({
      success: true,
      message: `User ${id} deleted successfully`,
      data: {
        id,
        deletedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = DeleteUserById;

