const uploadsService = require('./uploads.service');
const { success, error } = require('../../utils/response');

/**
 * POST /api/uploads/avatar
 */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return error(res, 'No file uploaded. Please select an image.', 400);
    }

    const user = await uploadsService.saveAvatar(req.user.id, req.file.filename);
    return success(res, {
      user,
      file: {
        filename: req.file.filename,
        url: `/api/uploads/${req.file.filename}`,
      },
    }, 200, 'Avatar uploaded successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/uploads/:filename
 */
async function serveFile(req, res, next) {
  try {
    const filePath = uploadsService.getFilePath(req.params.filename);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAvatar, serveFile };
