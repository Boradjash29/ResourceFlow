import express from 'express';
import multer from 'multer';
import path from 'path';
import { updateProfile, changePassword, updateAvatar, deleteAvatar, deleteAccount } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
  }
});

router.use(authMiddleware);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/avatar', upload.single('avatar'), updateAvatar);
router.delete('/avatar', deleteAvatar);
router.delete('/', deleteAccount);

export default router;
