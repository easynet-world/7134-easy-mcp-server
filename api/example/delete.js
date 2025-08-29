const { BaseAPI } = require('easy-mcp-server');

class DeleteExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item deleted' });
  }
  
  get description() {
    return 'Delete an item';
  }
}

module.exports = DeleteExample;
