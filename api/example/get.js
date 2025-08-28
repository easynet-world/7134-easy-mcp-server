/**
 * 🎯 ONE FUNCTION = THREE INTERFACES
 * 
 * Save this file and automatically get:
 * 1. REST API: GET /example
 * 2. MCP Tool: get_example (for AI models)
 * 3. OpenAPI: Complete documentation
 */

const BaseAPI = require('../../src/core/base-api');

class GetExample extends BaseAPI {
  // This single method creates everything automatically!
  process(req, res) {
    res.json({
      message: 'Hello from your API!',
      timestamp: new Date().toISOString(),
      magic: 'This response came from ONE JavaScript method!'
    });
  }
  
  get description() {
    return 'Get a simple greeting message from the server with timestamp and magic message';
  }
}

module.exports = GetExample;