import express from 'express';
import { getAnalytics, getUtilization, getRecentEvents, getCalendarEvents } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Basic stats are visible to all authenticated users
router.get('/stats', authMiddleware, getAnalytics);

// Specific analytics views
router.get('/utilization', authMiddleware, getUtilization);
router.get('/events', authMiddleware, getRecentEvents);
router.get('/calendar', authMiddleware, getCalendarEvents);

export default router;
