/**
 * @module middleware/auth
 * @description JWT authentication middleware for protecting routes.
 */

'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * Middleware that verifies a JWT token from the Authorization header.
 * Attaches decoded user info to `req.user`.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Resolve dynamic business ID based on active business type
    try {
      const { getDatabase } = require('../database/init');
      const db = getDatabase();
      const currentBiz = db.prepare('SELECT type FROM businesses WHERE id = ?').get(req.user.business_id);
      if (currentBiz) {
        req.user.original_business_id = decoded.business_id;
        const targetBiz = db.prepare('SELECT id FROM businesses WHERE type = ?').get(currentBiz.type);
        if (targetBiz) {
          req.user.business_id = targetBiz.id;
        }
      }
    } catch (dbErr) {
      console.error('Error resolving dynamic business ID:', dbErr);
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
}

/**
 * Factory that returns middleware restricting access to specific roles.
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'manager')
 * @returns {Function} Express middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }

    next();
  };
}

/**
 * Generates a JWT for the given user payload.
 * @param {Object} payload - User data to encode
 * @param {string} [expiresIn='24h'] - Token expiry
 * @returns {string} Signed JWT
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authenticate, authorize, generateToken };
