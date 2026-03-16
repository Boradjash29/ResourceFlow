import { query } from '../config/db.js';
import { checkConflict } from '../utils/conflictDetection.js';
import { getSuggestions } from '../utils/smartSuggestions.js';

export const getAllBookings = async (req, res) => {
  const { role, id: userId } = req.user;
  const { resource_id, start_date, end_date, status } = req.query;

  try {
    let queryText = `
      SELECT b.*, u.name as user_name, u.email as user_email, r.name as resource_name, r.type as resource_type 
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN resources r ON b.resource_id = r.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by role: Admin sees all, Others see restricted view (handled in PRD: Employee sees own details + others busy)
    // For MVP/Phase 2, let's allow fetching by user_id for "My Bookings"
    if (role !== 'admin') {
      // If not admin, restrict to own bookings OR filter by resource availability
      // But usually 'getAllBookings' is for the dashboard/calendar.
      // Let's implement basic filtering first.
    }

    if (userId && role !== 'admin') {
      queryText += ` AND b.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (resource_id) {
      queryText += ` AND b.resource_id = $${paramIndex++}`;
      params.push(resource_id);
    }

    if (start_date && end_date) {
      queryText += ` AND b.start_time >= $${paramIndex++} AND b.end_time <= $${paramIndex++}`;
      params.push(start_date, end_date);
    }

    if (status) {
      queryText += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }

    queryText += ' ORDER BY b.start_time ASC';

    const result = await query(queryText, params);
    res.status(200).json({ bookings: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createBooking = async (req, res) => {
  const { resource_id, start_time, end_time, meeting_title, description, participants = [] } = req.body;
  const userId = req.user.id;

  try {
    // 1. Validate resource exists and is available
    const resourceResult = await query('SELECT * FROM resources WHERE id = $1', [resource_id]);
    if (resourceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    if (resourceResult.rows[0].status === 'unavailable') {
      return res.status(400).json({ message: 'Resource is currently unavailable' });
    }

    // 2. Check for conflicts
    const conflict = await checkConflict(resource_id, start_time, end_time);
    if (conflict) {
      const suggestions = await getSuggestions(resource_id, start_time, end_time);
      return res.status(409).json({ 
        error: 'Time slot not available', 
        conflict,
        suggestions 
      });
    }

    // 3. Create booking
    const status = 'confirmed'; // TODO: Logic for 'pending' if resource requires approval
    const result = await query(
      `INSERT INTO bookings (user_id, resource_id, start_time, end_time, meeting_title, description, participants, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, resource_id, start_time, end_time, meeting_title, description, JSON.stringify(participants), status]
    );

    res.status(201).json({ message: 'Booking created successfully', booking: result.rows[0] });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const booking = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner or admin can cancel
    if (booking.rows[0].user_id !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await query("UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [id]);
    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
