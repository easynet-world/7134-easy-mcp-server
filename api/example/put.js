const { BaseAPI } = require('@easynet-world/easy-mcp-server');

class PutExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'PUT request successful', data: req.body, method: 'PUT' });
  }
  
  get description() {
    return 'Update an entire resource on the server. This endpoint replaces the complete resource with the data provided in the request body.';
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
              description: 'Complete resource data to replace existing resource'
            }
          }
        }
      }
    };
  }
}
module.exports = PutExample;