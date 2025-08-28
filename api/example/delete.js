class DeleteExample {
  process(req, res) {
    res.json({ message: 'DELETE request successful', method: 'DELETE' });
  }
  
  get openApi() {
    return {
      summary: 'Delete a resource',
      description: 'Remove a resource from the server. This endpoint demonstrates how to handle DELETE requests and return a confirmation message.'
      // Response schema auto-generated from runtime analysis!
    };
  }
  
  // MCP uses the OpenAPI description automatically
  get description() {
    return this.openApi.description;
  }
}
module.exports = DeleteExample;