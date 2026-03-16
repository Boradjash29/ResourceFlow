import express from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
