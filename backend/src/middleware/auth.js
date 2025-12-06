const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token and attach user info to request
 */
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId, // Keep for backwards compatibility
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to check if user has required role(s)
 * @param  {...string|Array<string>} allowedRoles - Roles that are allowed
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Handle both array and spread arguments
    const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
