import express from 'express';
import { getAllBookings, createBooking, cancelBooking } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllBookings);
router.post('/', createBooking);
router.delete('/:id', cancelBooking);

export default router;
