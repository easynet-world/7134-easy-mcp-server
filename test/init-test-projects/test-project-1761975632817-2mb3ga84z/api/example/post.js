const BaseAPI = require('easy-mcp-server/base-api');

/**
 * Example POST API endpoint
 * 
 * @api {post} /example Create example data
 * @apiName CreateExample
 * @apiGroup Example
 * @apiParam {String} message Example message
 * @apiSuccess {Object} data Created data
 */
class PostExample extends BaseAPI {
  process(req, res) {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    
    res.status(201).json({
      data: {
        message: message,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      }
    });
  }
}

module.exports = PostExample;
