import prisma from '../config/prisma.js';
import { randomUUID } from 'crypto';

/**
 * Shared logic for creating a booking.
 * Used by BOTH the direct controller (manual UI) and the chat controller (AI).
 */
export const createBookingInternal = async ({ 
  user_id, 
  resource_id, 
  start_time, 
  end_time, 
  meeting_title, 
  description, 
  participants = [],
  recurrence_rule = null
}) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate resource
    const resource = await tx.resource.findUnique({
      where: { id: resource_id }
    });

    if (!resource) {
      throw { status: 404, message: 'Resource not found' };
    }
    
    if (resource.status === 'unavailable') {
      throw { status: 400, message: 'Resource is currently unavailable' };
    }

    const participantCount = Array.isArray(participants) 
      ? participants.length 
      : (typeof participants === 'number' ? participants : (parseInt(participants) || 0));
    if (resource.capacity && participantCount > resource.capacity) {
      throw { status: 400, message: `Resource capacity exceeded. Max: ${resource.capacity}, Requested: ${participantCount}` };
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    const duration = end.getTime() - start.getTime();

    const instances = [];
    const series_id = recurrence_rule && recurrence_rule !== 'NONE' ? randomUUID() : null;

    if (!recurrence_rule || recurrence_rule === 'NONE') {
      instances.push({ start, end });
    } else {
      const MAX_INSTANCES = recurrence_rule === 'DAILY' ? 14 : (recurrence_rule === 'WEEKLY' ? 12 : 6);
      for (let i = 0; i < MAX_INSTANCES; i++) {
        const nextStart = new Date(start);
        if (recurrence_rule === 'DAILY') nextStart.setDate(start.getDate() + i);
        else if (recurrence_rule === 'WEEKLY') nextStart.setDate(start.getDate() + (i * 7));
        else if (recurrence_rule === 'MONTHLY') nextStart.setMonth(start.getMonth() + i);
        
        const nextEnd = new Date(nextStart.getTime() + duration);
        instances.push({ start: nextStart, end: nextEnd });
      }
    }

    // Check conflicts for ALL instances
    for (const inst of instances) {
      const conflict = await tx.booking.findFirst({
        where: {
          resource_id,
          status: { not: 'cancelled' },
          AND: [
            { start_time: { lt: inst.end } },
            { end_time: { gt: inst.start } }
          ]
        }
      });

      if (conflict) {
        throw { 
          status: 409, 
          message: `Conflict detected for instance on ${inst.start.toLocaleDateString()}`,
          conflict 
        };
      }
    }

    // Create all bookings
    const createdBookings = await Promise.all(instances.map(inst => 
      tx.booking.create({
        data: {
          user_id,
          resource_id,
          start_time: inst.start,
          end_time: inst.end,
          meeting_title: meeting_title || 'Meeting',
          description: description || '',
          participants,
          status: 'confirmed',
          recurrence_rule: series_id ? recurrence_rule : null,
          series_id
        },
        include: {
          resource: { select: { name: true, type: true } }
        }
      })
    ));

    return createdBookings[0]; // Return the first one for the response
  });
};
