/**
 * @module middleware/errorHandler
 * @description Global Express error handler with structured JSON responses.
 */

'use strict';

/**
 * Global error-handling middleware.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', err);
  } else {
    console.error('❌ Error:', err.message);
  }

  // Handle specific error types
  if (err.name === 'ValidationError' || err.status === 400) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Validation failed.',
      details: err.details || undefined
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Unauthorized.'
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      error: err.message || 'Forbidden.'
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Resource not found.'
    });
  }

  if (err.status === 409) {
    return res.status(409).json({
      success: false,
      error: err.message || 'Conflict.'
    });
  }

  // SQLite constraint errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      error: 'A record with this value already exists.'
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist.'
    });
  }

  // Default: 500 Internal Server Error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message || 'Internal server error.'
  });
}

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`
  });
}

module.exports = { errorHandler, notFoundHandler };
