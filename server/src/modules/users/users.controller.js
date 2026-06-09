const usersService = require('./users.service');
const { success, error } = require('../../utils/response');
const fs = require('fs');
const path = require('path');

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
 * GET /api/users/me/messages
 */
async function getMyMessages(req, res, next) {
  try {
    const messagesPath = path.join(__dirname, '../../../data/messages.json');
    let messages = [];
    if (fs.existsSync(messagesPath)) {
      messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
    }

    // Determine user's districts and brcs
    const brcsPath = path.join(__dirname, '../../../data/brcs.json');
    let allBrcs = [];
    if (fs.existsSync(brcsPath)) {
      allBrcs = JSON.parse(fs.readFileSync(brcsPath, 'utf8'));
    }

    const assignedBrcCodes = req.user.assignedBrcs || [];
    const userDistricts = new Set();
    
    assignedBrcCodes.forEach(code => {
      const brc = allBrcs.find(b => b.code === code);
      if (brc && brc.district) {
        userDistricts.add(brc.district);
      }
    });

    // Filter messages
    const applicableMessages = messages.filter(msg => {
      if (!msg.to || !Array.isArray(msg.to)) return false;
      return msg.to.some(target => {
        if (target === 'ALL') return true;
        if (target.startsWith('DISTRICT:')) {
          const districtName = target.split(':')[1];
          return userDistricts.has(districtName);
        }
        if (target.startsWith('BRC:')) {
          const brcCode = target.split(':')[1];
          return assignedBrcCodes.includes(brcCode);
        }
        return false;
      });
    });

    applicableMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return success(res, applicableMessages);
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

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser, getMyMessages };
