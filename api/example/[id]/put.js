const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Update an example by ID
 * @summary Update a specific example
 * @param {string} id - The ID of the example
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "name": { "type": "string" },
 *     "description": { "type": "string" }
 *   }
 * }
 */
class PutExampleById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    const { name, description } = req.body;
    res.json({
      success: true,
      data: { id, name, description },
      message: `Updated example with ID: ${id}`
    });
  }
}

module.exports = PutExampleById;

