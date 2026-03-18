import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    resource_id: z.string().uuid('Invalid resource ID'),
    start_time: z.string().datetime('Invalid start time format'),
    end_time: z.string().datetime('Invalid end time format'),
    meeting_title: z.string().min(3, 'Title must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    participants: z.array(z.string().email()).optional(),
  }),
});
