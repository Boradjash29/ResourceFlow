import prisma from '../config/prisma.js';
import { sanitize } from '../utils/sanitize.js';
import { createBookingInternal } from '../services/bookingService.js';
import { createAuditLog } from '../services/auditService.js';
import { syncBookingToGoogle, removeBookingFromGoogle } from '../services/calendarService.js';
import { emitToUser, emitToAll } from '../services/socketService.js';
import { sendBookingConfirmationEmail, sendBookingUpdateEmail, sendBookingCancellationEmail } from '../services/emailService.js';

export const getAllBookings = async (req, res) => {
  const { role, id: userId } = req.user;
  const { resource_id, start_date, end_date, status, search, page = 1, limit = 20, sort_by = 'start_time', sort_order = 'desc' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    const where = {};
    
    // Admins see all by default unless filtered, others only see their own
    if (role !== 'admin') {
      where.user_id = userId;
    }

    if (resource_id) where.resource_id = resource_id;
    if (status) where.status = status;
    
    // FIX: Bug #4 — Invalid Date Causes 500 Crash
    if (start_date || end_date) {
      where.start_time = {};
      if (start_date) {
        const d = new Date(start_date);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ message: "Invalid start_date format" });
        }
        where.start_time.gte = d;
      }
      if (end_date) {
        const d = new Date(end_date);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ message: "Invalid end_date format" });
        }
        where.start_time.lte = d;
      }
    }

    if (search) {
      where.OR = [
        { meeting_title: { contains: search, mode: 'insensitive' } },
        { resource: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { name: true, email: true } },
          resource: { select: { name: true, type: true } }
        },
        orderBy: { [sort_by]: sort_order }
      }),
      prisma.booking.count({ where })
    ]);

    // Flatten for frontend compatibility
    const flattenedBookings = bookings.map(b => ({
      ...b,
      user_name: b.user?.name,
      user_email: b.user?.email,
      resource_name: b.resource?.name,
      resource_type: b.resource?.type
    }));

    res.status(200).json({ 
      bookings: flattenedBookings, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createBooking = async (req, res) => {
  const { resource_id, start_time, end_time, meeting_title, description, participants = [], recurrence_rule = 'NONE' } = req.body;
  const userId = req.user.id;

  try {
    // Sanitize user inputs
    const cleanTitle = sanitize(meeting_title);
    const cleanDescription = sanitize(description);

    const booking = await createBookingInternal({
      user_id: userId,
      resource_id,
      start_time,
      end_time,
      meeting_title: cleanTitle,
      description: cleanDescription,
      participants,
      recurrence_rule
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

    // Feature 7: Send Confirmation Email
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      await sendBookingConfirmationEmail(user.email, user.name, booking, booking.resource);
    } catch (e) {
      console.error('Non-blocking Confirmation Email Error:', e);
    }

    emitToUser(userId, 'notification', {
      type: 'success',
      title: 'Booking Confirmed',
      message: `Your booking for ${booking.resource?.name || 'resource'} was successful.`
    });
    emitToAll('resource_updated', { resourceId: resource_id });

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error.status === 409) {
      return res.status(error.status).json({ 
        error: error.message, 
        conflict: error.conflict
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

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { 
        status: 'cancelled',
        updated_at: new Date()
      },
      include: {
        user: { select: { name: true, email: true } },
        resource: { select: { name: true, type: true } }
      }
    });

    // Feature 7: Send Cancellation Email
    try {
      await sendBookingCancellationEmail(
        updatedBooking.user.email, 
        updatedBooking.user.name, 
        updatedBooking, 
        updatedBooking.resource
      );
    } catch {
      console.error('Non-blocking Cancellation Email Error');
    }
    
    // Feature 26: Calendar Sync Removal
    try {
      await removeBookingFromGoogle(updatedBooking.external_event_id, updatedBooking.user);
    } catch {
      console.error('Non-blocking Calendar Sync Removal Error');
    }

    await createAuditLog({
      userId: userId,
      action: 'CANCEL',
      entityType: 'booking',
      entityId: id,
      details: { booking_id: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    emitToUser(userId, 'notification', {
      type: 'info',
      title: 'Booking Cancelled',
      message: `Your booking for ${updatedBooking.resource.name} has been cancelled.`
    });
    emitToAll('resource_updated', { resourceId: updatedBooking.resource_id });

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateBooking = async (req, res) => {
  const { id } = req.params;
  const { meeting_title, description, start_time, end_time, participants } = req.body;
  const userId = req.user.id;

  try {
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true, user: true }
    });

    if (!existing) return res.status(404).json({ message: 'Booking not found' });
    if (existing.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Sanitize
    const cleanTitle = meeting_title ? sanitize(meeting_title) : undefined;
    const cleanDescription = description ? sanitize(description) : undefined;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        meeting_title: cleanTitle,
        description: cleanDescription,
        start_time: start_time ? new Date(start_time) : undefined,
        end_time: end_time ? new Date(end_time) : undefined,
        participants: participants || undefined,
        updated_at: new Date()
      },
      include: { resource: true, user: true }
    });

    // Send Update Email
    try {
      await sendBookingUpdateEmail(updated.user.email, updated.user.name, updated, updated.resource);
    } catch {
      console.error('Non-blocking Update Email Error');
    }

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entityType: 'booking',
      entityId: id,
      details: { old: existing, new: updated },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    emitToUser(userId, 'notification', {
      type: 'info',
      title: 'Booking Updated',
      message: `Your booking for ${updated.resource.name} has been updated.`
    });
    emitToAll('resource_updated', { resourceId: updated.resource_id });

    res.status(200).json({ message: 'Booking updated successfully', booking: updated });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBookingById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        resource: { select: { name: true, type: true, location: true, capacity: true, image_url: true } },
        user: { select: { name: true, email: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user_id !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Initial counts
    const [totalResources, totalBookings, activeNowCount] = await Promise.all([
      prisma.resource.count(),
      prisma.booking.count({ where: { status: { not: 'cancelled' } } }),
      prisma.booking.count({
        where: {
          status: { not: 'cancelled' },
          start_time: { lte: now },
          end_time: { gte: now }
        }
      })
    ]);

    // Fetch relevant bookings for distributions
    const recentBookings = await prisma.booking.findMany({
      where: {
        status: { not: 'cancelled' },
        start_time: { gte: thirtyDaysAgo }
      },
      select: { start_time: true, resource: { select: { name: true } } }
    });

    // Distributions
    const hourlyData = Array(24).fill(0);
    const dailyData = Array(7).fill(0);
    const resourceUsage = {};

    recentBookings.forEach(b => {
      const date = new Date(b.start_time);
      hourlyData[date.getHours()]++;
      dailyData[date.getDay()]++;
      
      const rName = b.resource.name;
      resourceUsage[rName] = (resourceUsage[rName] || 0) + 1;
    });

    // Trends (6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyTrends = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short' });
      monthlyTrends[key] = 0;
    }

    const trendBookings = await prisma.booking.findMany({
      where: { start_time: { gte: sixMonthsAgo }, status: { not: 'cancelled' } },
      select: { start_time: true }
    });

    trendBookings.forEach(b => {
      const key = new Date(b.start_time).toLocaleString('default', { month: 'short' });
      if (monthlyTrends[key] !== undefined) monthlyTrends[key]++;
    });

    res.status(200).json({
      summary: {
        totalResources,
        totalBookings,
        activeBookings: activeNowCount, 
        availableResources: totalResources - activeNowCount
      },
      peakHours: hourlyData.map((count, hour) => ({ hour: `${hour}:00`, count })),
      dailyBookings: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => ({ name, count: dailyData[i] })),
      resourceUtilization: Object.entries(resourceUsage)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5),
      monthlyTrends: Object.entries(monthlyTrends).reverse().map(([name, count]) => ({ name, count }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkAvailability = async (req, res) => {
  const { resource_id, start_time, end_time, exclude_id } = req.query;

  if (!resource_id || !start_time || !end_time) {
    return res.status(400).json({ message: 'resource_id, start_time and end_time are required' });
  }

  try {
    const conflicts = await prisma.booking.findMany({
      where: {
        resource_id,
        status: { not: 'cancelled' },
        id: exclude_id ? { not: exclude_id } : undefined,
        OR: [
          { start_time: { lt: new Date(end_time) }, end_time: { gt: new Date(start_time) } }
        ]
      }
    });

    res.status(200).json({ available: conflicts.length === 0, conflicts });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkUpdateBookings = async (req, res) => {
  const { ids, status } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No booking IDs provided' });
  }

  try {
    // Only allow admins to update other users' bookings
    const where = role === 'admin' ? { id: { in: ids } } : { id: { in: ids }, user_id: userId };

    const result = await prisma.booking.updateMany({
      where,
      data: { status, updated_at: new Date() }
    });

    await createAuditLog({
      userId: userId,
      action: 'BULK_UPDATE_BOOKINGS',
      entityType: 'booking',
      details: { ids, status, updatedCount: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: `Successfully updated ${result.count} bookings`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkDeleteBookings = async (req, res) => {
  const { ids } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No booking IDs provided' });
  }

  try {
    const where = role === 'admin' ? { id: { in: ids } } : { id: { in: ids }, user_id: userId };

    const result = await prisma.booking.deleteMany({
      where
    });

    await createAuditLog({
      userId: userId,
      action: 'BULK_DELETE_BOOKINGS',
      entityType: 'booking',
      details: { ids, deletedCount: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: `Successfully deleted ${result.count} bookings`, count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelSeries = async (req, res) => {
  const { series_id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const firstBooking = await prisma.booking.findFirst({
      where: { series_id }
    });

    if (!firstBooking) {
      return res.status(404).json({ message: 'Series not found' });
    }

    if (firstBooking.user_id !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cancel all confirmed bookings in this series
    const result = await prisma.booking.updateMany({
      where: { 
        series_id,
        status: { not: 'cancelled' }
      },
      data: { 
        status: 'cancelled',
        updated_at: new Date()
      }
    });

    await createAuditLog({
      userId: userId,
      action: 'CANCEL_SERIES',
      entityType: 'booking_series',
      entityId: series_id,
      details: { series_id, cancelledCount: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    emitToUser(userId, 'notification', {
      type: 'info',
      title: 'Series Cancelled',
      message: `Successfully cancelled all ${result.count} bookings in the series.`
    });

    res.status(200).json({ message: `Successfully cancelled ${result.count} bookings in the series.` });
  } catch (error) {
    console.error('Error cancelling series:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUtilization = async (req, res) => {
  const { filter } = req.query;
  try {
    let startDate = new Date();
    if (filter === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (filter === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else startDate.setDate(startDate.getDate() - 30); // Default 30 days

    const bookings = await prisma.booking.findMany({
      where: {
        start_time: { gte: startDate },
        status: { not: 'cancelled' }
      },
      include: { resource: true }
    });

    // Group by resource type for utilization chart
    const utilizationMap = {};
    bookings.forEach(b => {
      const type = b.resource.type || 'Other';
      utilizationMap[type] = (utilizationMap[type] || 0) + 1;
    });

    const data = Object.entries(utilizationMap).map(([name, value]) => ({ name, value }));
    res.status(200).json(data);
  } catch (error) {
    console.error('Utilization error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRecentEvents = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: 'cancelled' },
        start_time: { gte: new Date() }
      },
      include: { 
        resource: { select: { name: true, type: true } },
        user: { select: { name: true } }
      },
      take: 10,
      orderBy: { start_time: 'asc' }
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Recent events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCalendarEvents = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: 'cancelled' },
        start_time: { gte: new Date() }
      },
      include: { resource: { select: { name: true } } },
      take: 50
    });

    const calendarEvents = bookings.map(b => ({
      id: b.id,
      title: b.meeting_title || `Booking: ${b.resource.name}`,
      start: b.start_time,
      end: b.end_time,
      resourceName: b.resource.name
    }));

    res.status(200).json(calendarEvents);
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
