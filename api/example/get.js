/**
 * 🎯 ONE FUNCTION = THREE INTERFACES
 * 
 * Save this file and automatically get:
 * 1. REST API: GET /example
 * 2. MCP Tool: get_example (for AI models)
 * 3. OpenAPI: Complete documentation
 */

class GetExample {
  // This single method creates everything automatically!
  process(req, res) {
    res.json({
      message: 'Hello from your API!',
      timestamp: new Date().toISOString(),
      magic: 'This response came from ONE JavaScript method!'
    });
  }
  
  // Enhanced OpenAPI documentation
  get openApi() {
    return {
      summary: 'Get greeting message',
      description: 'Get a simple greeting message from the server with timestamp and magic message',
      responses: {
        '200': {
          description: 'Successful response'
        }
      }
    };
  }
  
  // MCP uses the OpenAPI description automatically
  get description() {
    return this.openApi.description;
  }
}

module.exports = GetExample;