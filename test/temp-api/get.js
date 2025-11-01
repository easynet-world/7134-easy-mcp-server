
const BaseAPIEnhanced = require('../../src/lib/api/base-api-enhanced');

class FailingTestAPI extends BaseAPIEnhanced {
  async _initializeLLM() {
    throw new Error('Test API initialization failure');
  }

  async handleRequest(req, res) {
    res.json({ success: true, message: 'This should not be called' });
  }
}

module.exports = FailingTestAPI;
