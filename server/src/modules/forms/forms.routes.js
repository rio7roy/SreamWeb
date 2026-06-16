const express = require('express');
const router = express.Router();
const formsController = require('./forms.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// Optional auth middleware wrapper for public routes
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/templates', authenticate, formsController.getTemplates);
router.post('/templates', authenticate, formsController.createTemplate);

router.get('/', authenticate, formsController.getForms);
router.post('/', authenticate, formsController.createForm);
router.get('/:id', optionalAuth, formsController.getFormById);
router.put('/:id', authenticate, formsController.updateForm);
router.delete('/:id', authenticate, formsController.deleteForm);

router.get('/:id/responses', authenticate, formsController.getResponses);
router.post('/:id/responses', optionalAuth, formsController.submitResponse);

module.exports = router;
