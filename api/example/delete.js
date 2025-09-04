const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Delete an item
 * @summary Remove item completely
 */
class DeleteExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item deleted' });
  }
}

module.exports = DeleteExample;
