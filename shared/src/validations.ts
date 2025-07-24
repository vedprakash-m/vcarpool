import { z } from "zod";

// Keep this in sync with frontend/src/types/shared.ts

export const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  grade: z.string().min(1, "Grade is required"),
  school: z.string().min(1, "School is required"),
});

export const parentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  parent: parentSchema,
  secondParent: parentSchema.optional(),
  children: z.array(childSchema).min(1, "At least one child is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // For school carpool
  isActiveDriver: z.boolean().optional(),
  homeAddress: z.string().optional(),
});

export const createTripSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD"),
  departureTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM"),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM"),
  destination: z.string().min(1, "Destination is required"),
  maxPassengers: z.number().int().min(1, "Max passengers must be at least 1"),
  notes: z.string().optional(),
});

export const updateTripSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD")
    .optional(),
  departureTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM")
    .optional(),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format, should be HH:MM")
    .optional(),
  destination: z.string().min(1, "Destination is required").optional(),
  maxPassengers: z
    .number()
    .int()
    .min(1, "Max passengers must be at least 1")
    .optional(),
  notes: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
});

export const tripQuerySchema = z.object({
  destination: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD")
    .optional(),
  availableSeats: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// Forgot password: expects { email: string }
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Reset password: expects { token: string, newPassword: string }
export const resetPasswordSchema = z.object({
  token: z.string().min(8, "Invalid or missing reset token"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Change password: expects { oldPassword: string, newPassword: string }
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, "Old password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
