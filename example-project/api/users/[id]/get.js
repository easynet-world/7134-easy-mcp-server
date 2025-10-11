const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get user by ID
 * @summary Retrieve a specific user
 * @param {string} id - User ID
 */
class GetUserById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    
    // Sample user data
    const users = {
      '1': { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
      '2': { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
      '3': { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
    };
    
    const user = users[id];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = GetUserById;

