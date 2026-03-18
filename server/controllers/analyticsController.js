import prisma from '../config/prisma.js';

// Simple TTL-based cache for analytics
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = analyticsCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  return null;
};

const MAX_CACHE_SIZE = 100;

const setCachedData = (key, data) => {
  if (analyticsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = analyticsCache.keys().next().value;
    analyticsCache.delete(firstKey);
  }
  analyticsCache.set(key, { data, timestamp: Date.now() });
};

export const getDashboardStats = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Analytics are restricted to administrators.' });
  }
  try {
    const [
      totalResources,
      totalBookings,
      activeBookings,
      availableResources
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.booking.count({
        where: { status: { not: 'cancelled' } }
      }),
      prisma.booking.count({
        where: {
          status: 'confirmed',
          start_time: { lte: new Date() },
          end_time: { gte: new Date() }
        }
      }),
      prisma.resource.count({
        where: {
          status: 'available',
          bookings: {
            none: {
              status: 'confirmed',
              OR: [
                { start_time: { lte: new Date(), gte: new Date(new Date().setHours(0,0,0,0)) } },
                { end_time: { gte: new Date(), lte: new Date(new Date().setHours(23,59,59,999)) } }
              ]
            }
          }
        }
      })
    ]);

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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const { filter = 'week' } = req.query;
    const cacheKey = `utilization:${filter}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) return res.status(200).json(cached);

    let result;
    if (filter === 'year') {
      result = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(date_trunc('month', date_series), 'Mon') as date,
          COUNT(b.id) as created,
          COUNT(DISTINCT b.resource_id) as utilized
        FROM 
          GENERATE_SERIES(date_trunc('year', CURRENT_DATE), date_trunc('year', CURRENT_DATE) + interval '11 months', '1 month'::interval) date_series
        LEFT JOIN 
          bookings b ON date_trunc('month', b.start_time) = date_series AND b.status != 'cancelled'
        GROUP BY 
          date_series
        ORDER BY 
          date_series ASC
      `;
    } else if (filter === 'all') {
      result = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(date_trunc('year', date_series), 'YYYY') as date,
          COUNT(b.id) as created,
          COUNT(DISTINCT b.resource_id) as utilized
        FROM 
          GENERATE_SERIES(CURRENT_DATE - INTERVAL '4 years', CURRENT_DATE, '1 year'::interval) date_series
        LEFT JOIN 
          bookings b ON date_trunc('year', b.start_time) = date_series AND b.status != 'cancelled'
        GROUP BY 
          date_series
        ORDER BY 
          date_series ASC
      `;
    } else {
      // Default to week
      result = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(date_series, 'Mon DD') as date,
          COUNT(b.id) as created,
          COUNT(DISTINCT b.resource_id) as utilized
        FROM 
          GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) date_series
        LEFT JOIN 
          bookings b ON DATE(b.start_time) = date_series AND b.status != 'cancelled'
        GROUP BY 
          date_series
        ORDER BY 
          date_series ASC
      `;
    }

    // Prisma queryRaw returns BigInts for COUNTs, need to manually format for JSON/recharts
    const formattedResult = result.map(row => ({
      date: row.date,
      created: Number(row.created),
      utilized: Number(row.utilized)
    }));

    setCachedData(cacheKey, formattedResult);
    res.status(200).json(formattedResult);
  } catch (error) {
    console.error('Error fetching utilization data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPopularResources = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
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

export const getUpcomingEvents = async (req, res) => {
  try {
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    whereClause.start_time = { gte: new Date() };
    whereClause.status = 'confirmed';

    const events = await prisma.booking.findMany({
      where: whereClause,
      orderBy: { start_time: 'asc' },
      take: 2,
      include: { resource: true }
    });
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTasksData = async (req, res) => {
  try {
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    
    const statuses = ['pending', 'confirmed', 'cancelled'];
    const counts = await Promise.all(
      statuses.map(status => 
        prisma.booking.count({ where: { ...whereClause, status } })
      )
    );
    
    // Also count completed separately (confirmed but end_time is in the past)
    const completed = await prisma.booking.count({
      where: { ...whereClause, status: 'confirmed', end_time: { lt: new Date() } }
    });

    res.status(200).json({
      pending: counts[0],
      confirmed: counts[1] - completed, // Active/Future confirmed
      completed: completed,
      cancelled: counts[2]
    });
  } catch (error) {
    console.error('Error fetching tasks data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCalendarData = async (req, res) => {
  try {
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    whereClause.status = 'confirmed';
    
    // Just get all active bookings for this month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    // Improved cross-month logic: find any booking that OVERLAPS with this month
    whereClause.AND = [
      { start_time: { lte: endOfMonth } },
      { end_time: { gte: startOfMonth } }
    ];

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      select: { start_time: true, end_time: true }
    });
    
    const daysWithBookings = new Set();
    bookings.forEach(b => {
      let current = new Date(Math.max(b.start_time, startOfMonth));
      const end = new Date(Math.min(b.end_time, endOfMonth));
      while (current <= end) {
        daysWithBookings.add(current.getDate());
        current.setDate(current.getDate() + 1);
      }
    });

    res.status(200).json(Array.from(daysWithBookings));
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
