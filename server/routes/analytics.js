import express from 'express';
import { getDashboardStats, getUtilizationData, getPopularResources } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getDashboardStats);
router.get('/utilization', getUtilizationData);
router.get('/popular', getPopularResources);

export default router;
