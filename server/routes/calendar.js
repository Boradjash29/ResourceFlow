import express from 'express';
import { connectGoogleCalendar, googleCallback, getCalendarStatus, disconnectGoogleCalendar, importExternalEvents } from '../controllers/calendarController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Used by user from frontend
router.get('/google/connect', authMiddleware, connectGoogleCalendar);

// Redirect URI specifically for Google OAuth
router.get('/callback/google', googleCallback);

// Verify if connected
router.get('/status', authMiddleware, getCalendarStatus);

// Disconnect
router.post('/disconnect', authMiddleware, disconnectGoogleCalendar);

// Import Events
router.post('/import', authMiddleware, importExternalEvents);

export default router;
