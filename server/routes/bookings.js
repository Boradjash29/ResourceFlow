import express from 'express';
import { 
  getAllBookings, createBooking, cancelBooking, getBookingById, 
  checkAvailability, cancelSeries, bulkUpdateBookings, bulkDeleteBookings, updateBooking 
} from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createBookingSchema } from '../validations/booking.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllBookings);
router.get('/check-availability', checkAvailability);
router.get('/:id', getBookingById);
router.post('/', validate(createBookingSchema), createBooking);
router.patch('/bulk-status', bulkUpdateBookings);
router.delete('/bulk-delete', bulkDeleteBookings);
router.patch('/:id', updateBooking);
router.delete('/:id', cancelBooking);
router.delete('/series/:series_id', cancelSeries);

export default router;
