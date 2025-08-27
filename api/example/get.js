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
  
  // Optional: Describe what this does for AI models
  get description() {
    return 'Get a simple greeting message from the server';
  }
}

module.exports = GetExample;