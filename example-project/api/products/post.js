const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Create a new product in the system
 * @summary Create product
 * @tags products,product-management
 * @requestBody { "type": "object", "properties": { "name": { "type": "string", "description": "Product's name" } }, "required": ["name"] }
 * @response 200 {Object} Success response with creation confirmation
 * @responseExample {json} 200 Success
 * {
 *   "message": "Created Laptop"
 * }
 */
class PostProducts extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    res.json({ message: `Created ${name}` });
  }
}

module.exports = PostProducts;
