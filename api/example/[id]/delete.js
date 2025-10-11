const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Delete an example by ID
 * @summary Delete a specific example
 * @param {string} id - The ID of the example
 */
class DeleteExampleById extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    res.json({
      success: true,
      data: { id },
      message: `Deleted example with ID: ${id}`
    });
  }
}

module.exports = DeleteExampleById;

