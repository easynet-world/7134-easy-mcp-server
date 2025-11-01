const BaseAPI = require('easy-mcp-server/base-api');

/**
 * Example GET API endpoint
 * 
 * @api {get} /example Get example data
 * @apiName GetExample
 * @apiGroup Example
 * @apiSuccess {Object} data Example data object
 * @apiSuccess {String} data.message Example message
 * @apiSuccess {Number} data.timestamp Current timestamp
 */
class GetExample extends BaseAPI {
  process(req, res) {
    res.json({
      data: {
        message: 'This is an example API endpoint',
        timestamp: Date.now(),
        description: 'This endpoint was automatically generated when you ran easy-mcp-server init'
      }
    });
  }
}

module.exports = GetExample;
