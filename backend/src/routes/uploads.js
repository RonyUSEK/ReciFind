const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const RECIPE_IMAGE_DIR = path.join(UPLOAD_ROOT, 'recipes');

fs.mkdirSync(RECIPE_IMAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RECIPE_IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '';
    const random = crypto.randomBytes(12).toString('hex');
    cb(null, `recipe-${Date.now()}-${random}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WebP images are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/uploads/recipes
// Auth required (chef/admin). Stores image locally and returns a URL path.
router.post(
  '/recipes',
  authenticate,
  requireRole(['chef', 'admin']),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    return res.status(201).json({
      image_url: `/uploads/recipes/${req.file.filename}`,
    });
  }
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image must be 5MB or smaller' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }

  return next();
});

module.exports = router;
