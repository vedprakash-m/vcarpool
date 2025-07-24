import { z } from 'zod';

// Schema for user ID in URL
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

// Schema for trip stats query parameters
export const tripStatsQuerySchema = z.object({
  timeRange: z.enum(['week', 'month', 'year', 'all']).optional().default('all'),
});
