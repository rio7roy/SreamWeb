const { Router } = require('express');
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { loginSchema, registerSchema } = require('@stream/shared');

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
