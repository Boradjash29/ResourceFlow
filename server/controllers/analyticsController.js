import prisma from '../config/prisma.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalResources = await prisma.resource.count();
    const totalBookings = await prisma.booking.count({
      where: { status: { not: 'cancelled' } }
    });
    const activeBookings = await prisma.booking.count({
      where: {
        status: 'confirmed',
        start_time: { lte: new Date() },
        end_time: { gte: new Date() }
      }
    });

    const availableResources = await prisma.resource.count({
      where: {
        status: 'available',
        bookings: {
          none: {
            status: 'confirmed',
            start_time: { lte: new Date() },
            end_time: { gte: new Date() }
          }
        }
      }
    });

    res.status(200).json({
      totalResources,
      totalBookings,
      activeBookings,
      availableResources
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUtilizationData = async (req, res) => {
  try {
    // Get booking counts for a 7-day window centered on today (3 past, 3 future)
    const result = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date_series, 'Mon DD') as date,
        COUNT(b.id)::int as count
      FROM 
        GENERATE_SERIES(CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', '1 day'::interval) date_series
      LEFT JOIN 
        bookings b ON DATE(b.start_time) = date_series AND b.status != 'cancelled'
      GROUP BY 
        date_series
      ORDER BY 
        date_series ASC
    `;

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching utilization data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPopularResources = async (req, res) => {
  try {
    const result = await prisma.resource.findMany({
      select: {
        name: true,
        _count: {
          select: {
            bookings: {
              where: { status: { not: 'cancelled' } }
            }
          }
        }
      },
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const formatted = result.map(r => ({
      name: r.name,
      booking_count: r._count.bookings
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching popular resources:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
