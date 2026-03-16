import { query } from '../config/db.js';

/**
 * Fetches all audit logs from the system with user details.
 */
export const getAuditLogs = async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.status(200).json(result.rows);
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
    const result = await query(`
      SELECT b.*, u.name as user_name, r.name as resource_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN resources r ON b.resource_id = r.id
      ORDER BY b.start_time DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
