const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Generate a JWT token with the given payload.
 * @param {object} payload - Data to encode (typically { id, role })
 * @returns {string} Signed JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - JWT token string
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
