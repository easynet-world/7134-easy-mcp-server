/**
 * 🎯 ONE FUNCTION = THREE INTERFACES
 * 
 * Save this file and automatically get:
 * 1. REST API: POST /example
 * 2. MCP Tool: post_example (for AI models)
 * 3. OpenAPI: Complete documentation
 */


const BaseAPI = require('../../src/core/base-api');

class PostExample extends BaseAPI {
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
  
  get description() {
    return 'Create a greeting by sending name and optional message';
  }
  
  // Enhanced OpenAPI documentation with custom request body
  get openApi() {
    return {
      ...super.openApi,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the person to greet (required)',
                  example: 'John Doe'
                },
                message: {
                  type: 'string',
                  description: 'Optional message to include',
                  example: 'Welcome to our API!'
                }
              }
            }
          }
        }
      }
    };
  }
}

module.exports = PostExample;