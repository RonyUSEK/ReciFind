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
 * Middleware to optionally verify JWT token.
 * If a Bearer token is present and valid, attaches req.user.
 * If no token is present, continues without error.
 * If a token is present but invalid, returns 401.
 */
function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    // Public endpoints should remain accessible even if a client sends a stale token.
    // Treat invalid/expired tokens as unauthenticated.
    return next();
  }
}

/**
 * Middleware to check if user has required role(s)
 * @param  {...string|Array<string>} allowedRoles - Roles that are allowed
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Handle both array and spread arguments
    const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
    
    // Roles in JWT can become stale after admin promotion/demotion.
    // Use the database as the source of truth so role changes apply immediately.
    try {
      const pool = req.app?.locals?.pool;
      if (pool && req.user.userId) {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows[0]?.role) {
          req.user.role = result.rows[0].role;
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }

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
  authenticateOptional,
  requireRole,
};
