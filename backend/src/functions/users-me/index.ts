import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, User } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, AuthenticatedRequest } from '../../middleware';
import { trackExecutionTime } from '../../utils/monitoring';

async function getMeHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.user;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  // Log the operation start
  logger.info('Retrieving user profile', { userId: request.user?.userId });

  const userId = request.user!.userId;

  try {
    // Get user profile with performance tracking
    const user = await trackExecutionTime('getUserById', 
      () => container.userService.getUserById(userId),
      'UserService'
    );

    if (!user) {
      logger.warn('User profile not found', { userId });
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'User not found'
        } as ApiResponse
      };
    }

    logger.info('User profile retrieved successfully', { userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: user
      } as ApiResponse<User>
    };
  } catch (error) {
    logger.error('Error retrieving user profile', { userId, error });
    throw error; // Let the error handler middleware handle it
  }
}

app.http('users-me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: compose(
    cors,
    errorHandler,
    authenticate
  )(getMeHandler)
});
