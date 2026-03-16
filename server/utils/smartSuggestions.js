import prisma from '../config/prisma.js';

/**
 * Finds alternative slots when a conflict occurs.
 */
export const getSuggestions = async (resource_id, start_time, end_time) => {
  const suggestions = [];
  
  // 1. Find next available slot on the same resource
  const nextSlot = await prisma.booking.findFirst({
    where: {
      resource_id,
      status: { not: 'cancelled' },
      end_time: { gte: new Date(end_time) }
    },
    orderBy: { end_time: 'asc' },
    select: { end_time: true }
  });
  
  if (nextSlot) {
    suggestions.push({
      resource_id,
      start_time: nextSlot.end_time,
      reason: 'Same resource, next available slot'
    });
  }

  // 2. Find similar resources (same type) available at requested time
  const resource = await prisma.resource.findUnique({
    where: { id: resource_id },
    select: { type: true }
  });

  if (resource) {
    const alternatives = await prisma.resource.findMany({
      where: {
        type: resource.type,
        id: { not: resource_id },
        status: 'available',
        bookings: {
          none: {
            status: { not: 'cancelled' },
            AND: [
              { start_time: { lt: new Date(end_time) } },
              { end_time: { gt: new Date(start_time) } }
            ]
          }
        }
      },
      take: 2,
      select: { id: true, name: true }
    });

    alternatives.forEach(res => {
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
