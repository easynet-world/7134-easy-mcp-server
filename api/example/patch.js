class PatchExample {
  process(req, res) {
    res.json({ message: 'PATCH request successful', data: req.body, method: 'PATCH' });
  }
  
  get openApi() {
    return {
      summary: 'Partially update resource',
      description: 'Partially update a resource on the server. This endpoint allows you to modify specific fields of an existing resource without replacing the entire object.',
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
      },
      responses: {
        '200': {
          description: 'Resource updated successfully'
        }
      }
    };
  }
  
  // MCP uses the OpenAPI description automatically
  get description() {
    return this.openApi.description;
  }
}
module.exports = PatchExample;