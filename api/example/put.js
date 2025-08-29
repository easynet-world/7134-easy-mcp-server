const { BaseAPI } = require('easy-mcp-server');

class PutExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item updated' });
  }
  
  get description() {
    return 'Update an item';
  }
}

module.exports = PutExample;