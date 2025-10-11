const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Delete product by ID
 * @summary Delete a specific product
 * @param {string} id - Product ID
 */
class DeleteProductById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    
    res.json({
      success: true,
      message: `Product ${id} deleted successfully`,
      data: {
        id,
        deletedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = DeleteProductById;

