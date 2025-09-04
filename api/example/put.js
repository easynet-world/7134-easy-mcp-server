const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Update an item
 * @summary Update item completely
 */
class PutExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item updated' });
  }
}

module.exports = PutExample;