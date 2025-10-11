const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all examples
 * @summary List all examples
 */
class GetExamples extends BaseAPI {
  process(req, res) {
    res.json({
      success: true,
      data: [
        { id: '1', name: 'Example 1' },
        { id: '2', name: 'Example 2' }
      ],
      message: 'Fetched all examples'
    });
  }
}

module.exports = GetExamples;

