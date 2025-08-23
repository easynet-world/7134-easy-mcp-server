class UserProfileProcessor {
  constructor() {
    this.name = this.constructor.name;
  }

  process(req, res) {
    this.sendSuccess(res, { 
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        profile: 'This is a dynamically loaded API endpoint!'
      }
    });
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
      summary: 'Get user profile',
      description: 'Retrieve user profile information',
      tags: ['user', 'profile']
    };
  }
}

module.exports = UserProfileProcessor;
