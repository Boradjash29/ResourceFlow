import prisma from '../config/prisma.js';
import { checkConflict } from '../utils/conflictDetection.js';

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
  participants = [] 
}) => {
  console.log(`[BOOKING SERVICE] Attempting to book resource: ${resource_id}`);
  return await prisma.$transaction(async (tx) => {
    // 1. Validate resource
    const resource = await tx.resource.findUnique({
      where: { id: resource_id }
    });

    console.log(`[BOOKING SERVICE] Resource lookup result:`, resource ? `Found (${resource.name})` : 'NOT FOUND');

    if (!resource) {
      throw { status: 404, message: 'Resource not found' };
    }
    
    if (resource.status === 'unavailable') {
      throw { status: 400, message: 'Resource is currently unavailable' };
    }

    // 2. Capacity Check
    const participantCount = Array.isArray(participants) ? participants.length : 0;
    if (resource.capacity && participantCount > resource.capacity) {
      throw { status: 400, message: `Resource capacity exceeded. Max: ${resource.capacity}, Requested: ${participantCount}` };
    }

    // 3. Time Validation
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start) || isNaN(end) || start >= end) {
      throw { status: 400, message: 'Invalid time range provided' };
    }
    if (start < new Date()) {
      throw { status: 400, message: 'Cannot book in the past' };
    }

    // 3. Check for conflicts
    const conflict = await tx.booking.findFirst({
      where: {
        resource_id,
        status: { not: 'cancelled' },
        AND: [
          { start_time: { lt: end } },
          { end_time: { gt: start } }
        ]
      }
    });

    if (conflict) {
      throw { 
        status: 409, 
        message: 'Time slot not available (conflict detected)',
        conflict 
      };
    }

    // 3. Create booking
    const booking = await tx.booking.create({
      data: {
        user_id,
        resource_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        meeting_title: meeting_title || 'AI Generated Booking',
        description: description || '',
        participants,
        status: 'confirmed'
      },
      include: {
        resource: { select: { name: true, type: true } }
      }
    });

    return booking;
  });
};
