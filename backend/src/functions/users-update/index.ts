import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { updateUserSchema, ApiResponse, User } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, validateBody, AuthenticatedRequest } from '../../middleware';
import { trackExecutionTime } from '../../utils/monitoring';

async function updateMeHandler(
  request: AuthenticatedRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.user;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  const userId = request.user!.userId;
  const updates = request.validatedBody;

  // Log the operation start
  logger.info('Updating user profile', { userId, updateFields: Object.keys(updates) });

  try {
    // Update user profile with performance tracking
    const updatedUser = await trackExecutionTime('updateUser', 
      () => container.userService.updateUser(userId, updates),
      'UserService'
    );

    if (!updatedUser) {
      logger.warn('User not found during profile update', { userId });
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'User not found'
        } as ApiResponse
      };
    }

    logger.info('User profile updated successfully', { userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      } as ApiResponse<User>
    };
  } catch (error) {
    logger.error('Error updating user profile', { userId, error });
    throw error; // Let the error handler middleware handle it
  }
}

app.http('users-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validateBody(updateUserSchema)
  )(updateMeHandler)
});
