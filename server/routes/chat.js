import express from 'express';
import { handleAssistantChat, manualSync } from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/message', handleAssistantChat);
router.post('/sync', manualSync);

export default router;
