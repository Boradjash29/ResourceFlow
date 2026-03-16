import { query } from '../config/db.js';

/**
 * Finds alternative slots when a conflict occurs.
 */
export const getSuggestions = async (resource_id, start_time, end_time) => {
  const suggestions = [];
  
  // 1. Find next available slot on the same resource (within 7 days)
  const nextSlotResult = await query(
    `SELECT end_time FROM bookings 
     WHERE resource_id = $1 AND status != 'cancelled' AND end_time >= $2
     ORDER BY end_time ASC LIMIT 1`,
    [resource_id, end_time]
  );
  
  if (nextSlotResult.rows.length > 0) {
    suggestions.push({
      resource_id,
      start_time: nextSlotResult.rows[0].end_time,
      reason: 'Same resource, next available slot'
    });
  }

  // 2. Find similar resources (same type) available at requested time
  const resourceResult = await query('SELECT type FROM resources WHERE id = $1', [resource_id]);
  if (resourceResult.rows.length > 0) {
    const type = resourceResult.rows[0].type;
    const alternatives = await query(
      `SELECT r.id, r.name FROM resources r
       WHERE r.type = $1 AND r.id != $2 AND r.status = 'available'
       AND NOT EXISTS (
         SELECT 1 FROM bookings b 
         WHERE b.resource_id = r.id AND b.status != 'cancelled'
         AND (b.start_time < $4 AND b.end_time > $3)
       )
       LIMIT 2`,
      [type, resource_id, start_time, end_time]
    );

    alternatives.rows.forEach(res => {
      suggestions.push({
        resource_id: res.id,
        resource_name: res.name,
        start_time,
        reason: 'Similar resource, same time'
      });
    });
  }

  return suggestions.slice(0, 3);
};
