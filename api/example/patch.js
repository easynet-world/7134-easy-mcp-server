const BaseAPI = require('../../src/core/base-api');

class PatchExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'PATCH request successful', data: req.body, method: 'PATCH' });
  }
  
  get description() {
    return 'Partially update a resource on the server. This endpoint allows you to modify specific fields of an existing resource without replacing the entire object.';
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
              description: 'Partial resource data to update'
            }
          }
        }
      }
    };
  }
}
module.exports = PatchExample;