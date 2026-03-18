import express from 'express';
import {
  register, login, getCurrentUser, logout, refresh, updateProfile,
  verifyEmail, forgotPassword, resetPassword,
  getSessions, revokeSession,
  setup2FA, verify2FASetup, validate2FA, disable2FA
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { loginLimiter, registerLimiter } from '../middleware/authRateLimiter.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validations/auth.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/2fa/setup', authMiddleware, setup2FA);
router.post('/2fa/verify-setup', authMiddleware, verify2FASetup);
router.post('/2fa/validate', validate2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.get('/sessions', authMiddleware, getSessions);
router.delete('/sessions/:id', authMiddleware, revokeSession);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
