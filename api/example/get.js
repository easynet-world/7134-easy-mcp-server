const BaseAPI = require('../../src/core/base-api');

/**
 * @description Get a greeting message
 * @summary Get hello world message
 */
class GetExample extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Hello World' });
  }
}

module.exports = GetExample;