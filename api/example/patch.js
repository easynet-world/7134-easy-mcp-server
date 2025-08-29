const BaseAPI = require('../../src/core/base-api');

/**
 * @description Partially update an item
 * @summary Patch item partially
 */
class PatchExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Item patched' });
  }
}

module.exports = PatchExample;