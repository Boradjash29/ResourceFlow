import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import prisma from '../config/prisma.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { logEvent } from '../services/auditService.js';
import { sanitize } from '../utils/sanitize.js';

/**
 * Generates Access and Refresh tokens for a user.
 */
const generateTokens = (user) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('CRITICAL: JWT secrets are missing from environment variables');
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Sets JWT tokens in httpOnly cookies.
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id; // Assuming user ID is available from req.user (e.g., from auth middleware)
    
    const data = {};
    if (name) data.name = sanitize(name);
    
    // FIX: Bug #1 — Identity Switch / Email Verification Bypass
    let emailChanged = false;
    if (email && email !== req.user.email) {
      data.email = email;
      data.is_verified = false;
      emailChanged = true;
    } else if (email) {
      data.email = email;
    }

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: data,
      select: { id: true, name: true, email: true, role: true, is_verified: true } // Select fields to return
    });

    if (emailChanged) {
      const verificationToken = jwt.sign(
        { id: updatedUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      try {
        await sendVerificationEmail(updatedUser.email, verificationToken);
      } catch (err) {
        console.error('Failed to send verification email on update:', err);
      }
    }

    await logEvent({
      userId: userId,
      action: 'UPDATE_PROFILE',
      entityType: 'USER',
      details: { updatedFields: Object.keys(data) },
      req
    });

    res.status(200).json({
      message: emailChanged 
        ? 'Profile updated. Please verify your new email address.' 
        : 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile. Please try again later.' });
  }
};

/**
 * Register a new user.
 */
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const role = 'employee';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ message: 'This email is already registered' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, password_hash: passwordHash, role, is_verified: false }
    });

    const verificationToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('SMTP Error during registration:', emailError);
      // Bug 3: Rollback user creation if email fails
      await prisma.user.delete({ where: { id: user.id } });
      return res.status(500).json({ 
        message: 'Could not send verification email. Please try again later.' 
      });
    }

    await logEvent({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'USER',
      req
    });

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
};

/**
 * Login a user.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check Account Lockout
    if (user.locked_until && user.locked_until > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((user.locked_until.getTime() - Date.now()) / 60000));
      return res.status(403).json({ 
        message: `Account is temporarily locked. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.` 
      });
    }

    // Check Email Verification
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email address before logging in.' });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      // FIX: Bug #3 — Race Condition on Failed Login Counter
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: { increment: 1 } }
      });
      
      const updates = {};
      if (updatedUser.failed_login_attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        updates.failed_login_attempts = 0;
        
        await logEvent({
          userId: user.id,
          action: 'ACCOUNT_LOCKOUT',
          entityType: 'USER',
          details: { duration: '30m' },
          req
        });
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Success - Handle 2FA if enabled
    if (user.two_factor_enabled) {
      const tempToken = jwt.sign(
        { id: user.id, is2FAPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.status(200).json({ requires2FA: true, tempToken });
    }

    // Reset attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, locked_until: null }
    });

    const { accessToken, refreshToken } = generateTokens(user);

    await prisma.session.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: 'Login successful',
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
};

/**
 * Handle Token Refresh.
 */
export const refresh = async (req, res) => {
  const { refreshToken: oldRefreshToken } = req.cookies;

  if (!oldRefreshToken) return res.status(401).json({ message: 'Session expired' });

  try {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('CRITICAL: JWT_REFRESH_SECRET is missing');
    }
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
    
    const session = await prisma.session.findUnique({
      where: { refresh_token: oldRefreshToken },
      include: { user: true }
    });

    if (!session || session.expires_at < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ message: 'Invalid session' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.user);

    await prisma.session.delete({ where: { id: session.id } });
    await prisma.session.create({
      data: {
        user_id: session.user.id,
        refresh_token: newRefreshToken,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    setTokenCookies(res, accessToken, newRefreshToken);

    res.status(200).json({ user: { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role } });
  } catch {
    res.status(401).json({ message: 'Invalid session' });
  }
};

/**
 * Verify Email Token.
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Verification token is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.update({
      where: { id: decoded.id },
      data: { is_verified: true }
    });
    
    // Feature 7: Send Welcome Email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
      console.error('Non-blocking Welcome Email Error:', e);
    }

    res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
  } catch {
    res.status(400).json({ message: 'Verification link is invalid or has expired.' });
  }
};

/**
 * Request Password Reset Email.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: {
          user_id: user.id,
          token: resetToken,
          expires_at: new Date(Date.now() + 3600000) // 1 hour
        }
      });
      
      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        console.error('SMTP Error in forgotPassword:', emailError);
        return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
      }
    }
    // Generic response to prevent account enumeration
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

/**
 * Reset Password with Token.
 */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });

  try {
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetTokenRecord || resetTokenRecord.used || resetTokenRecord.expires_at < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.user_id },
        data: { password_hash: passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { used: true }
      })
    ]);

    await logEvent({
      userId: resetTokenRecord.user_id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      req
    });

    res.status(200).json({ message: 'Password reset successfully!' });
  } catch {
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
};

/**
 * Get Active Sessions.
 */
export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });

    // FIX: Bug #5 — Mobile/Header-Based Auth Breaks isCurrent Session Check
    const currentRefreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'];
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      isCurrent: s.refresh_token === currentRefreshToken
    }));

    res.status(200).json({ sessions: formattedSessions });
  } catch {
    res.status(500).json({ message: 'Failed to fetch sessions.' });
  }
};

/**
 * Revoke a specific session.
 */
export const revokeSession = async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await prisma.session.delete({ where: { id } });

    await logEvent({
      userId: req.user.id,
      action: 'REVOKE_SESSION',
      entityType: 'SESSION',
      entityId: id,
      req
    });

    res.status(200).json({ message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke session' });
  }
};

/**
 * Initialize 2FA Setup.
 */
export const setup2FA = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.two_factor_enabled) return res.status(400).json({ message: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({ name: `ResourceFlow (${user.email})` });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { two_factor_secret: secret.base32 }
    });

    res.status(200).json({ qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initialize 2FA setup.' });
  }
};

/**
 * Verify and Enable 2FA.
 */
export const verify2FASetup = async (req, res) => {
  const { code } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { two_factor_enabled: true }
      });

      await logEvent({ userId: req.user.id, action: 'ENABLE_2FA', entityType: 'USER', req });
      res.status(200).json({ message: 'Two-Factor Authentication enabled successfully!' });
    } else {
      res.status(400).json({ message: 'Invalid 2FA code. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify 2FA setup.' });
  }
};

/**
 * Validate 2FA Code during Login.
 */
export const validate2FA = async (req, res) => {
  const { code, tempToken } = req.body;
  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.is2FAPending) return res.status(401).json({ message: 'Invalid request' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      // Reset attempts on success
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: 0, locked_until: null }
      });

      const { accessToken, refreshToken } = generateTokens(user);
      
      await prisma.session.create({
        data: {
          user_id: user.id,
          refresh_token: refreshToken,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      setTokenCookies(res, accessToken, refreshToken);
      await logEvent({ userId: user.id, action: 'LOGIN_SUCCESS_2FA', entityType: 'SESSION', req });

      res.status(200).json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
          two_factor_enabled: user.two_factor_enabled,
          created_at: user.created_at
        } 
      });
    } else {
      res.status(401).json({ message: 'Invalid 2FA code.' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
};

/**
 * Disable 2FA.
 */
export const disable2FA = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { two_factor_enabled: false, two_factor_secret: null }
    });

    await logEvent({ userId: req.user.id, action: 'DISABLE_2FA', entityType: 'USER', req });
    res.status(200).json({ message: 'Two-Factor Authentication disabled.' });
  } catch {
    res.status(500).json({ message: 'Failed to disable 2FA.' });
  }
};

/**
 * Get Current Logged In User.
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, is_verified: true, avatar_url: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch {
    res.status(500).json({ message: 'Failed to fetch user profile.' });
  }
};

/**
 * Logout User.
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refresh_token: refreshToken } });
    }
    
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    // Only log if we have a user (from authMiddleware or if token was valid)
    const userId = req.user?.id;
    await logEvent({ 
      userId, 
      action: 'LOGOUT', 
      entityType: 'SESSION', 
      req 
    });
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to logout.' });
  }
};
