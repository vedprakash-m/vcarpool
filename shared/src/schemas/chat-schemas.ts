import { z } from "zod";

export const createChatSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID format"),
  name: z.string().min(1, "Chat name is required").optional(),
  description: z.string().optional(),
});

export const chatsQuerySchema = z.object({
  userId: z.string().uuid("Invalid user ID format").optional(),
  tripId: z.string().uuid("Invalid trip ID format").optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  includeInactive: z.coerce.boolean().optional().default(false),
});
