/**
 * BaseProcessor - Base class for all API handlers
 * All API handlers should inherit from this class and implement the process method
 */
class BaseProcessor {
  constructor() {
    this.name = this.constructor.name;
  }

  async process(req, res, next) {
    throw new Error('process method must be implemented by subclass');
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
}

BaseProcessor.prototype.openApi = {
  summary: 'API Endpoint',
  description: 'API endpoint description',
  tags: ['default']
};

module.exports = BaseProcessor;
