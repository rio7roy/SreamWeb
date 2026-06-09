const { ZodError } = require('zod');
const { env } = require('../config/env');

/**
 * Global error handling middleware.
 * Catches and formats errors from Zod, in-memory DB, JWT, and generic sources.
 */
function errorHandler(err, req, res, _next) {
  // Log error in development
  if (env.NODE_ENV === 'development') {
    console.error('🔥 Error:', err.message || err);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }

  // In-memory DB constraint errors (mirrors Prisma error codes)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired.',
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.',
    });
  }

  // Generic errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : message,
  });
}

module.exports = { errorHandler };
