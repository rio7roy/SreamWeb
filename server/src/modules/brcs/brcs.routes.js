const express = require('express');
const router = express.Router();
const brcsController = require('./brcs.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Public or authenticated access to read BRCs
router.get('/', brcsController.getAllBrcs);

// Admin only access to write
router.put('/:code', authenticate, authorize('ADMIN'), brcsController.updateBrc);

module.exports = router;
