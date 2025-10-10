/**
 * Global Middleware for all API routes
 * This middleware applies to all routes in the api/ directory
 */

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      errorCode: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }
  
  // Simple token validation (replace with your logic)
  if (token !== 'Bearer valid-token') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      errorCode: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }
  
  // Add user info to request
  req.user = { id: 1, name: 'User', role: 'user' };
  next();
};

// Logging middleware
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    originalEnd.apply(this, args);
  };
  
  next();
};

// Rate limiting middleware
const rateLimit = (() => {
  const requests = new Map();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  
  return (req, res, next) => {
    const clientId = req.ip;
    const now = Date.now();
    
    // Clean old entries
    for (const [key, data] of requests.entries()) {
      if (now - data.firstRequest > windowMs) {
        requests.delete(key);
      }
    }
    
    const clientData = requests.get(clientId);
    
    if (!clientData) {
      requests.set(clientId, { firstRequest: now, count: 1 });
      next();
    } else if (now - clientData.firstRequest > windowMs) {
      requests.set(clientId, { firstRequest: now, count: 1 });
      next();
    } else if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.firstRequest + windowMs - now) / 1000),
        timestamp: new Date().toISOString()
      });
    } else {
      clientData.count++;
      next();
    }
  };
})();

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

// Export middleware array (applied in order)
module.exports = [
  securityHeaders,
  logRequest,
  rateLimit,
  authenticate
];
