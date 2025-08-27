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
  
  // Optional: Describe what this does for AI models
  get description() {
    return 'Create a greeting by sending name and optional message';
  }
}

module.exports = PostExample;