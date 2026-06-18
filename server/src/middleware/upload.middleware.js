const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { env } = require('../config/env');

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueName}${ext}`);
  },
});

// File filter — allow images, PDFs, and spreadsheets
const fileFilter = (_req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'text/csv', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, PDF, CSV, and Excel files are allowed.'), false);
  }
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

/**
 * Post-upload middleware: compresses and resizes the uploaded image using Sharp.
 * Replaces the original file with the optimized version.
 */
async function compressImage(req, res, next) {
  if (!req.file || req.file.mimetype === 'application/pdf') {
    return next();
  }

  try {
    const filePath = req.file.path;
    const outputFilename = `opt-${req.file.filename.replace(path.extname(req.file.filename), '.webp')}`;
    const outputPath = path.join(uploadDir, outputFilename);

    const fileBuffer = fs.readFileSync(filePath);

    await sharp(fileBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Remove original file
    fs.unlinkSync(filePath);

    // Update file info on request
    req.file.filename = outputFilename;
    req.file.path = outputPath;
    req.file.mimetype = 'image/webp';

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Post-upload middleware: compresses an array of images.
 */
async function compressImages(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    await Promise.all(req.files.map(async (file) => {
      if (file.mimetype === 'application/pdf') {
        return;
      }
      
      const filePath = file.path;
      const outputFilename = `opt-${file.filename.replace(path.extname(file.filename), '.webp')}`;
      const outputPath = path.join(uploadDir, outputFilename);

      const fileBuffer = fs.readFileSync(filePath);

      await sharp(fileBuffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(filePath);

      file.filename = outputFilename;
      file.path = outputPath;
      file.mimetype = 'image/webp';
    }));
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, compressImage, compressImages };
