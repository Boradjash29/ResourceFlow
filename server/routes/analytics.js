import express from 'express';
import { getDashboardStats, getUtilizationData, getPopularResources, getUpcomingEvents, getTasksData, getCalendarData } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getDashboardStats);
router.get('/utilization', getUtilizationData);
router.get('/popular', getPopularResources);
router.get('/events', getUpcomingEvents);
router.get('/tasks', getTasksData);
router.get('/calendar', getCalendarData);

export default router;
