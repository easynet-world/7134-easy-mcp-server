const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get product by ID
 * @summary Retrieve a specific product
 * @param {string} id - Product ID
 */
class GetProductById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    
    // Sample product data
    const products = {
      '1': { id: '1', name: 'Laptop', price: 999.99, stock: 50 },
      '2': { id: '2', name: 'Mouse', price: 29.99, stock: 150 },
      '3': { id: '3', name: 'Keyboard', price: 79.99, stock: 75 }
    };
    
    const product = products[id];
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = GetProductById;

