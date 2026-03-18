import express from 'express';
import { getAuditLogs } from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Only Admins can see Audit Logs
router.get('/audit-logs', authMiddleware, roleMiddleware(['admin']), getAuditLogs);

export default router;
