import express from 'express';
import { getNotifications, markAsRead, clearAllNotifications } from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/', clearAllNotifications);

export default router;
