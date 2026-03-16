import { query } from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalResources = await query('SELECT COUNT(*) FROM resources');
    const totalBookings = await query('SELECT COUNT(*) FROM bookings WHERE status != $1', ['cancelled']);
    const activeBookings = await query(
      'SELECT COUNT(*) FROM bookings WHERE status = $1 AND start_time <= NOW() AND end_time >= NOW()',
      ['confirmed']
    );
    const availableResources = await query(
      "SELECT COUNT(*) FROM resources WHERE status = 'available' AND id NOT IN (SELECT resource_id FROM bookings WHERE status = 'confirmed' AND start_time <= NOW() AND end_time >= NOW())"
    );

    res.status(200).json({
      totalResources: parseInt(totalResources.rows[0].count),
      totalBookings: parseInt(totalBookings.rows[0].count),
      activeBookings: parseInt(activeBookings.rows[0].count),
      availableResources: parseInt(availableResources.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUtilizationData = async (req, res) => {
  try {
    // Get booking counts per day for the last 7 days
    const result = await query(`
      SELECT 
        TO_CHAR(date_series, 'Mon DD') as date,
        COUNT(b.id) as count
      FROM 
        GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) date_series
      LEFT JOIN 
        bookings b ON DATE(b.start_time) = date_series AND b.status != 'cancelled'
      GROUP BY 
        date_series
      ORDER BY 
        date_series ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching utilization data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPopularResources = async (req, res) => {
  try {
    const result = await query(`
      SELECT r.name, COUNT(b.id) as booking_count
      FROM resources r
      LEFT JOIN bookings b ON r.id = b.resource_id AND b.status != 'cancelled'
      GROUP BY r.id
      ORDER BY booking_count DESC
      LIMIT 5
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching popular resources:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
