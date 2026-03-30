import express from 'express';
import { 
  getDashboardStats, 
  getUtilizationData, 
  getUpcomingEvents, 
  getCalendarData 
} from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Stats are visible to authenticated users (admin check is inside controller if needed)
router.get('/stats', authMiddleware, getDashboardStats);
router.get('/utilization', authMiddleware, getUtilizationData);
router.get('/events', authMiddleware, getUpcomingEvents);
router.get('/calendar', authMiddleware, getCalendarData);

export default router;
