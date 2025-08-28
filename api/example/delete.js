const BaseAPI = require('../../src/core/base-api');

class DeleteExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'DELETE request successful', method: 'DELETE' });
  }
  
  get description() {
    return 'Remove a resource from the server. This endpoint demonstrates how to handle DELETE requests and return a confirmation message.';
  }
}
module.exports = DeleteExample;