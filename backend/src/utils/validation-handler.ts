import { z } from 'zod';
import { Errors } from './error-handler';

/**
 * Validates input data against a Zod schema
 * Throws validation error if data is invalid
 */
export function handleValidation<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });

      throw Errors.BadRequest(`Validation failed: ${messages.join(', ')}`);
    }

    throw error;
  }
}

/**
 * Validates input data and returns result with success flag
 * Does not throw errors, useful for optional validation
 */
export function validateSafely<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });

      return { success: false, errors };
    }

    return { success: false, errors: ['Unknown validation error'] };
  }
}
