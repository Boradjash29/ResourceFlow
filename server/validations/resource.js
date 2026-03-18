import { z } from 'zod';

export const resourceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Resource name must be at least 2 characters'),
    type: z.enum(['ROOM', 'EQUIPMENT', 'VEHICLE', 'DESK']),
    location: z.string().min(2, 'Location is required'),
    capacity: z.number().int().min(1, 'Capacity must be at least 1').optional(),
    description: z.string().max(1000).optional(),
    image_url: z.string().url('Invalid image URL').optional(),
    status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED']).optional(),
  }),
});
