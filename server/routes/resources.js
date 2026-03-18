import express from 'express';
import { 
  getAllResources, 
  createResource, 
  updateResource, 
  deleteResource,
  getResourceById,
  getResourceTypes,
  bulkUpdateResources,
  bulkDeleteResources
} from '../controllers/resourceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Publicly accessible for logged in users
router.get('/', authMiddleware, getAllResources);
router.get('/types', authMiddleware, getResourceTypes);
router.get('/:id', authMiddleware, getResourceById);

// Admin only routes
router.post('/', authMiddleware, roleMiddleware(['admin']), createResource);
router.patch('/bulk-status', authMiddleware, roleMiddleware(['admin']), bulkUpdateResources);
router.delete('/bulk-delete', authMiddleware, roleMiddleware(['admin']), bulkDeleteResources);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateResource);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteResource);

export default router;
