const BaseProcessor = require('../src/BaseProcessor');

class HelloProcessor extends BaseProcessor {
  process(req, res) {
    this.sendSuccess(res, { message: 'Hello World!' });
  }

  get openApi() {
    return {
      summary: 'Hello World endpoint',
      tags: ['demo']
    };
  }
}

module.exports = HelloProcessor;
