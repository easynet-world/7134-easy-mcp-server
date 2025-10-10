const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all products in the system
 * @summary Retrieve product list
 * @tags products,data-access
 * @responseSchema { "type": "object", "properties": { "products": { "type": "array", "items": { "type": "string" } } } }
 */
class GetProducts extends BaseAPI {
  process(req, res) {
    res.json({ products: ['Laptop', 'Mouse', 'Keyboard'] });
  }
}

module.exports = GetProducts;
