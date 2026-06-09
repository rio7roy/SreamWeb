const authService = require('./auth.service');
const { success } = require('../../utils/response');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);
    return success(res, result, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return success(res, result, 201, 'Registration successful');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return success(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    return success(res, updatedUser, 200, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, getProfile, updateProfile };
