import prisma from '../config/prisma.js';

/**
 * Fetches all audit logs from the system with user details.
 */
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });
    
    // Flatten for frontend
    const formatted = logs.map(log => ({
      ...log,
      user_name: log.user?.name || 'System',
      user_email: log.user?.email || 'N/A'
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Fetches all bookings for the administrative overview.
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { name: true } },
        resource: { select: { name: true } }
      },
      orderBy: { start_time: 'desc' }
    });

    const formatted = bookings.map(b => ({
      ...b,
      user_name: b.user.name,
      resource_name: b.resource.name
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
