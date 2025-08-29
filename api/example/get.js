const { BaseAPI } = require('easy-mcp-server');

class GetExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Hello World' });
  }
  
  get description() {
    return 'Get a greeting message';
  }
}

module.exports = GetExample;