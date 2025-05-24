import { z } from 'zod';

// Schema for trip ID in URL
export const tripIdParamSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID format')
});

// Schema for join trip request body
export const joinTripParamSchema = z.object({
  pickupLocation: z.string().min(1, 'Pickup location is required')
});
