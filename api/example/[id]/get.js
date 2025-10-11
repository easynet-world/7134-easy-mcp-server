const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get an example by ID
 * @summary Retrieve a specific example
 * @param {string} id - The ID of the example
 */
class GetExampleById extends BaseAPI {
  process(req, res) {
    res.json({
      success: true,
      data: { id: req.params.id },
      message: `Fetched example with ID: ${req.params.id}`
    });
  }
}

module.exports = GetExampleById;

