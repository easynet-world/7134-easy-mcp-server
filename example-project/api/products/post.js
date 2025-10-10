const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Create a new product in the system
 * @summary Create product
 * @tags products,product-management
 * @requestBody { "type": "object", "required": ["name"], "properties": { "name": { "type": "string", "minLength": 2 } } }
 * @responseSchema { "type": "object", "properties": { "message": { "type": "string" } } }
 */
class PostProducts extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    res.json({ message: `Created ${name}` });
  }
}

module.exports = PostProducts;
