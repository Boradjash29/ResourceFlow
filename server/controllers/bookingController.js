import prisma from '../config/prisma.js';
import { getSuggestions } from '../utils/smartSuggestions.js';
import { createBookingInternal } from '../services/bookingService.js';
import { createAuditLog } from '../services/auditService.js';

export const getAllBookings = async (req, res) => {
  const { role, id: userId } = req.user;
  const { resource_id, start_date, end_date, status } = req.query;

  try {
    const where = {};
    
    // Admins see all by default unless filtered, others only see their own
    if (role !== 'admin') {
      where.user_id = userId;
    }

    if (resource_id) where.resource_id = resource_id;
    
    if (start_date && end_date) {
      where.AND = [
        { start_time: { lt: new Date(end_date) } },
        { end_time: { gt: new Date(start_date) } }
      ];
    }

    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        resource: { select: { name: true, type: true } }
      },
      orderBy: { start_time: 'asc' }
    });

    // Flatten for frontend compatibility
    const flattenedBookings = bookings.map(b => ({
      ...b,
      user_name: b.user?.name,
      user_email: b.user?.email,
      resource_name: b.resource?.name,
      resource_type: b.resource?.type
    }));

    res.status(200).json({ bookings: flattenedBookings, count: flattenedBookings.length });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createBooking = async (req, res) => {
  const { resource_id, start_time, end_time, meeting_title, description, participants = [] } = req.body;
  const userId = req.user.id;

  try {
    const booking = await createBookingInternal({
      user_id: userId,
      resource_id,
      start_time,
      end_time,
      meeting_title,
      description,
      participants
    });

    await createAuditLog({
      userId: userId,
      action: 'CREATE',
      entityType: 'booking',
      entityId: booking.id,
      details: { title: booking.meeting_title, resource_id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error.status === 409) {
      const suggestions = await getSuggestions(resource_id, start_time, end_time);
      return res.status(error.status).json({ 
        error: error.message, 
        conflict: error.conflict,
        suggestions 
      });
    }

    res.status(error.status || 500).json({ message: error.message || 'Internal server error' });
  }
};

export const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user_id !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.booking.update({
      where: { id },
      data: { 
        status: 'cancelled',
        updated_at: new Date()
      }
    });

    await createAuditLog({
      userId: userId,
      action: 'CANCEL',
      entityType: 'booking',
      entityId: id,
      details: { booking_id: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
