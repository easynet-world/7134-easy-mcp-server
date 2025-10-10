/**
 * Admin-specific Middleware
 * This middleware applies only to routes under /admin/
 */

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  const { user } = req;
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      errorCode: 'ADMIN_ACCESS_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Admin audit logging
const auditLog = (req, res, next) => {
  const { user, method, path, body } = req;
  
  // Log admin actions for audit trail
  console.log(`Admin Action: ${user.name} (${user.id}) - ${method} ${path}`, {
    timestamp: new Date().toISOString(),
    action: `${method} ${path}`,
    adminId: user.id,
    adminName: user.name,
    requestBody: body
  });
  
  next();
};

// Admin session validation
const validateAdminSession = (req, res, next) => {
  const { user } = req;
  
  // Check if admin session is still valid
  // In a real app, you'd check session expiry, etc.
  if (!user.sessionValid) {
    return res.status(401).json({
      success: false,
      error: 'Admin session expired',
      errorCode: 'ADMIN_SESSION_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Export as single function (alternative to array/object)
module.exports = (req, res, next) => {
  // Apply all admin middleware in sequence
  requireAdmin(req, res, (err) => {
    if (err) return;
    
    auditLog(req, res, (err) => {
      if (err) return;
      
      validateAdminSession(req, res, next);
    });
  });
};
