import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodSchema } from 'zod';
import { container } from '../container';
import { ILogger } from '../utils/logger';
import { handleError } from '../utils/error-handler';

/**
 * Factory to create thin Azure Function handlers.
 *
 * Example usage:
 * app.http("trips-create", {
 *   methods: ["POST"],
 *   authLevel: "anonymous",
 *   route: "trips/create",
 *   handler: createFunctionHandler("CreateTripUseCase", createTripSchema),
 * });
 */
export function createFunctionHandler<TInput, TResult>(
  useCaseToken: string,
  inputSchema: ZodSchema<TInput>,
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const logger = container.resolve<ILogger>('ILogger');

    try {
      // 1. Authentication (assumed done by upstream middleware)
      const userId = request.auth?.userId;
      if (!userId) {
        throw new Error('User not authenticated.');
      }

      // 2. Validate input
      const body = await request.json();
      const data = inputSchema.parse(body);

      // 3. Resolve Use-Case and execute
      const useCase = container.resolve<any>(useCaseToken) as {
        execute: (userId: string, input: TInput) => Promise<TResult>;
      };
      const result = await useCase.execute(userId, data);

      logger.info(`${useCaseToken} executed successfully`, {
        userId,
        useCase: useCaseToken,
      });

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result,
        },
      };
    } catch (error) {
      return handleError(error, request);
    }
  };
}
