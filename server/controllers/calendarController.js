import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getGoogleAuthUrl, handleGoogleCallback, fetchAndImportExternalEvents } from '../services/calendarService.js';

const prisma = new PrismaClient();

export const connectGoogleCalendar = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Sign a state token with the user ID and a short expiry (5 mins)
    const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const url = getGoogleAuthUrl(state);
    res.status(200).json({ url });
  } catch (error) {
    console.error('Error starting Google connection:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const googleCallback = async (req, res) => {
  const { code, state } = req.query;
  
  try {
    if (!state) {
      return res.status(400).send('Missing state parameter');
    }
    
    // Verify the state JWT
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    await handleGoogleCallback(code, userId);
    
    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings?calendar=success`);
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings?calendar=error`);
  }
};

export const getCalendarStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { google_calendar_access_token: true }
    });
    
    res.status(200).json({ connected: !!user.google_calendar_access_token });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const disconnectGoogleCalendar = async (req, res) => {
  const userId = req.user.id;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        google_calendar_access_token: null,
        google_calendar_refresh_token: null,
        google_calendar_expiry: null
      }
    });

    res.status(200).json({ message: 'Calendar disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disconnect calendar' });
  }
};

export const importExternalEvents = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const result = await fetchAndImportExternalEvents(user);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error || result.message });
    }
    
    res.status(200).json({ message: `Successfully imported ${result.count} events` });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error while importing' });
  }
};
