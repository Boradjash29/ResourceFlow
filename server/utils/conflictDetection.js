import { query } from '../config/db.js';

/**
 * Checks if a resource is available during a specified time range.
 * Returns the conflicting booking if found, otherwise null.
 */
export const checkConflict = async (resource_id, start_time, end_time, excludeBookingId = null) => {
  let queryText = `
    SELECT * FROM bookings 
    WHERE resource_id = $1 
      AND status != 'cancelled'
      AND (
        (start_time < $3 AND end_time > $2)
      )
  `;
  
  const params = [resource_id, start_time, end_time];

  if (excludeBookingId) {
    queryText += ` AND id != $4`;
    params.push(excludeBookingId);
  }

  const result = await query(queryText, params);
  return result.rows.length > 0 ? result.rows[0] : null;
};
