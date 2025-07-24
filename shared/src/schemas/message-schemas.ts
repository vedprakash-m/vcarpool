import { z } from "zod";
import { MessageType } from "../types";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  type: z.nativeEnum(MessageType),
  metadata: z.record(z.any()).optional(),
});

export const messagesQuerySchema = z.object({
  chatId: z.string().uuid("Invalid chat ID format"),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  page: z.coerce.number().int().min(1).optional().default(1),
});
