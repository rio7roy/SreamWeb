const { Router } = require('express');
const uploadsController = require('./uploads.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { upload, compressImage } = require('../../middleware/upload.middleware');

const router = Router();

// Upload avatar — authenticated users
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  compressImage,
  uploadsController.uploadAvatar
);

// Serve uploaded file — public (avatar URLs are shared)
router.get('/:filename', uploadsController.serveFile);

module.exports = router;
