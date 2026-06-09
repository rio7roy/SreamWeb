const usersService = require('./users.service');
const { success, error } = require('../../utils/response');

/**
 * GET /api/users
 */
async function listUsers(req, res, next) {
  try {
    const { page, limit, role, search, isActive } = req.query;
    const result = await usersService.listUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    return success(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users
 */
async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(req.body);
    return success(res, user, 201, 'User created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id
 */
async function updateUser(req, res, next) {
  try {
    // Non-admin users can only update themselves
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return error(res, 'You can only update your own profile.', 403);
    }

    // Non-admin users cannot change their own role
    if (req.user.role !== 'ADMIN' && req.body.role) {
      delete req.body.role;
    }

    const user = await usersService.updateUser(req.params.id, req.body);
    return success(res, user, 200, 'User updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id
 */
async function deleteUser(req, res, next) {
  try {
    // Prevent self-deletion
    if (req.user.id === req.params.id) {
      return error(res, 'You cannot deactivate your own account.', 400);
    }
    await usersService.deleteUser(req.params.id);
    return success(res, null, 200, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
