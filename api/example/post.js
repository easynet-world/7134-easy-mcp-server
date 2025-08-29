const BaseAPI = require('../../src/core/base-api');

/**
 * @description Create a greeting with a name
 * @summary Create personalized greeting
 */
class PostExample extends BaseAPI {
  process(req, res) {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    res.json({ message: `Hello ${name}!` });
  }
}

module.exports = PostExample;