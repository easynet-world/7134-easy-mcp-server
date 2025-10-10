/**
 * User-specific Middleware
 * This middleware applies only to routes under /users/
 */

// User validation middleware
const validateUser = (req, res, next) => {
  // Check if user exists in request (set by global auth middleware)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'User authentication required',
      errorCode: 'USER_AUTH_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// User permissions middleware
const checkUserPermissions = (req, res, next) => {
  const { user } = req;
  const { method, path } = req;
  
  // Check if user can perform this action
  if (method === 'DELETE' && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      errorCode: 'INSUFFICIENT_PERMISSIONS',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// User activity logging
const logUserActivity = (req, res, next) => {
  const { user, method, path } = req;
  
  console.log(`User Activity: ${user.name} (${user.id}) - ${method} ${path}`);
  
  next();
};

// Export as object (alternative to array)
module.exports = {
  validateUser,
  checkUserPermissions,
  logUserActivity
};
