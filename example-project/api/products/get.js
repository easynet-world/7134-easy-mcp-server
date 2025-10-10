const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all products in the system
 * @summary Retrieve product list
 * @tags products,data-access
 * @response 200 {Object} Success response with product data
 * @responseExample {json} 200 Success
 * {
 *   "products": ["Laptop", "Mouse", "Keyboard"]
 * }
 */
class GetProducts extends BaseAPI {
  process(req, res) {
    res.json({ products: ['Laptop', 'Mouse', 'Keyboard'] });
  }
}

module.exports = GetProducts;
