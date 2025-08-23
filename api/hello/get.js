class HelloProcessor {
  constructor() {
    this.name = this.constructor.name;
  }

  process(req, res) {
    this.sendSuccess(res, { message: 'Hello World!' });
  }

  sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  sendError(res, message, statusCode = 400) {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  get openApi() {
    return {
      summary: 'Hello World endpoint',
      tags: ['demo']
    };
  }
}

module.exports = HelloProcessor;
