class PutExample {
  process(req, res) {
    res.json({ message: 'PUT request successful', data: req.body, method: 'PUT' });
  }
  
  get openApi() {
    return {
      summary: 'Update entire resource',
      description: 'Update an entire resource on the server. This endpoint replaces the complete resource with the data provided in the request body.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Complete resource data to replace existing resource'
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
module.exports = PutExample;