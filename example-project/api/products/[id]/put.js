const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Update product by ID
 * @summary Update a specific product
 * @param {string} id - Product ID
 * @body {string} name - Product name
 * @body {number} price - Product price
 * @body {number} stock - Product stock quantity
 */
class UpdateProductById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    const { name, price, stock } = req.body;
    
    res.json({
      success: true,
      message: `Product ${id} updated successfully`,
      data: {
        id,
        name: name || 'Updated Product',
        price: price || 0,
        stock: stock || 0,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = UpdateProductById;

