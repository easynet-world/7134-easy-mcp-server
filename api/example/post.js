/**
 * 🎯 ONE FUNCTION = THREE INTERFACES
 * 
 * Save this file and automatically get:
 * 1. REST API: POST /example
 * 2. MCP Tool: post_example (for AI models)
 * 3. OpenAPI: Complete documentation
 */


class PostExample {
  // This single method creates everything automatically!
  process(req, res) {
    const { name, message } = req.body;
    
    // Simple validation
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Your business logic here
    const result = {
      success: true,
      message: `Hello ${name}!`,
      received: { name, message: message || 'No message' },
      timestamp: new Date().toISOString()
    };
    
    res.status(201).json(result);
  }
  
  // Enhanced OpenAPI documentation
  get openApi() {
    return {
      summary: 'Create greeting',
      description: 'Create a greeting by sending name and optional message',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', description: 'Name of the person to greet' },
                message: { type: 'string', description: 'Optional message to include' }
              }
            }
          }
        }
      }
      // Response schema auto-generated from runtime analysis!
    };
  }
  
  // MCP uses the OpenAPI description automatically
  get description() {
    return this.openApi.description;
  }
}

module.exports = PostExample;