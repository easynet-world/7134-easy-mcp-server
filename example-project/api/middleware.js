/**
 * Simple middleware example for the example project
 * This file demonstrates basic middleware patterns
 */

module.exports = {
  /**
   * Simple request logger
   */
  logger: (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  },

  /**
   * Add a custom header to all responses
   */
  addCustomHeader: (req, res, next) => {
    res.setHeader('X-Example-Project', 'true');
    next();
  }
};

