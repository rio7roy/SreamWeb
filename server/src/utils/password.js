const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password.
 * @param {string} plainPassword - The password to hash
 * @returns {Promise<string>} The hashed password
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password.
 * @param {string} plainPassword - The plain text password
 * @param {string} hashedPassword - The hashed password from the database
 * @returns {Promise<boolean>} True if passwords match
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
