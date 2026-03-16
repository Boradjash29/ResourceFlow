import prisma from '../config/prisma.js';

/**
 * Checks if a resource is available during a specified time range.
 * Returns the conflicting booking if found, otherwise null.
 */
export const checkConflict = async (resource_id, start_time, end_time, excludeBookingId = null) => {
  const conflict = await prisma.booking.findFirst({
    where: {
      resource_id,
      status: { not: 'cancelled' },
      AND: [
        { start_time: { lt: new Date(end_time) } },
        { end_time: { gt: new Date(start_time) } }
      ],
      ...(excludeBookingId && { id: { not: excludeBookingId } })
    }
  });
  
  return conflict;
};
