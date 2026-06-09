const { Router } = require('express');
const usersController = require('./users.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { createUserSchema, updateUserSchema, userParamsSchema } = require('@stream/shared');

const router = Router();

// All routes require authentication
router.use(authenticate);

// List users — ADMIN only
router.get('/', authorize('ADMIN'), usersController.listUsers);

// Get my messages
router.get('/me/messages', usersController.getMyMessages);

// Create user — ADMIN only
router.post('/', authorize('ADMIN'), validate(createUserSchema), usersController.createUser);

// Get user by ID — ADMIN or self
router.get('/:id', validate(userParamsSchema, 'params'), usersController.getUserById);

// Update user — ADMIN or self (controller enforces self-only for non-admins)
router.patch('/:id', validate(userParamsSchema, 'params'), validate(updateUserSchema), usersController.updateUser);

// Delete (deactivate) user — ADMIN only
router.delete('/:id', authorize('ADMIN'), validate(userParamsSchema, 'params'), usersController.deleteUser);

module.exports = router;
