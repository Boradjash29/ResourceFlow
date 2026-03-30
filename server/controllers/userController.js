import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { logEvent } from '../services/auditService.js';

/**
 * Update user profile (name, email).
 */
export const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  try {
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } }
      });
      if (existingUser) return res.status(409).json({ message: 'Email address already in use' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, name: true, email: true, role: true, avatar_url: true }
    });

    await logEvent({ userId, action: 'UPDATE_PROFILE', entityType: 'USER', req });
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

/**
 * Change user password.
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash }
    });

    await logEvent({ userId, action: 'CHANGE_PASSWORD', entityType: 'USER', req });
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to change password' });
  }
};

/**
 * Update user avatar.
 */
export const updateAvatar = async (req, res) => {
  const userId = req.user.id;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: avatarUrl },
      select: { id: true, name: true, email: true, avatar_url: true }
    });

    await logEvent({ userId, action: 'UPDATE_AVATAR', entityType: 'USER', req });
    res.status(200).json({ message: 'Avatar updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update avatar' });
  }
};

/**
 * Delete user avatar.
 */
export const deleteAvatar = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: null },
      select: { id: true, name: true, email: true, avatar_url: true }
    });

    await logEvent({ userId, action: 'DELETE_AVATAR', entityType: 'USER', req });
    res.status(200).json({ message: 'Avatar removed', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove avatar' });
  }
};

/**
 * Delete account.
 */
export const deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    // Delete user (cascade will handle sessions, bookings, etc. based on schema)
    await prisma.user.delete({ where: { id: userId } });

    // Note: Since the user is deleted, we can't log the specific event tied to that userId easily 
    // without creating a system-level log. We'll skip logEvent here or log it as 'SYSTEM'
    
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account' });
  }
};
