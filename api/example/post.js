const { BaseAPI } = require('easy-mcp-server');

class PostExample extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    res.json({ message: `Hello ${name}!` });
  }
  
  get description() {
    return 'Create a greeting with a name';
  }
}

module.exports = PostExample;