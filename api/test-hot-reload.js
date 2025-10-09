const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @api {get} /test-hot-reload Test Hot Reload Endpoint
 * @apiName TestHotReload
 * @apiGroup Test
 * @apiDescription This endpoint tests hot reload functionality
 */
class TestHotReload extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Hot reload test endpoint - VERSION 2 - UPDATED!',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      hotReloadWorking: true
    });
  }
}

module.exports = TestHotReload;
