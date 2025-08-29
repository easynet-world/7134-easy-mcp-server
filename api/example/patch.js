const { BaseAPI } = require('easy-mcp-server');

class PatchExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item patched' });
  }
  
  get description() {
    return 'Partially update an item';
  }
}

module.exports = PatchExample;