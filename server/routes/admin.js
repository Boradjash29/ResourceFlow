import express from 'express';
import { getAuditLogs, getAllBookings } from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/audit-logs', getAuditLogs);
router.get('/bookings', getAllBookings);

export default router;
