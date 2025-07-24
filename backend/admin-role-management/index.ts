/**
 * Admin Role Management
 *
 * Migrated from JavaScript to TypeScript
 * Uses UserDomainService for unified user management
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  corsMiddleware,
} from '../src/middleware';
import { container } from '../src/container';
import { UserDomainService } from '../src/services/domains/user-domain.service';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserEntity, UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { ILogger } from '../src/utils/logger';

// Handler function
async function adminRoleManagementHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });
  const userDomainService = container.resolve<UserDomainService>('UserDomainService');

  try {
    const method = request.method?.toUpperCase();
    const userId = request.query.get('userId');
    const currentUserId = request.auth!.userId; // Ensured by authenticate middleware

    logger.info('Admin role management request', { method, userId, currentUserId });

    switch (method) {
      case 'GET':
        if (userId) {
          // Get specific user's role information
          const userResult = await userDomainService.getUser(userId);
          if (!userResult.success) {
            throw Errors.NotFound('User not found');
          }

          const roleInfo = {
            userId: userResult.data.id,
            email: userResult.data.email,
            firstName: userResult.data.firstName,
            lastName: userResult.data.lastName,
            role: userResult.data.role,
            isActive: userResult.data.isActive,
            createdAt: userResult.data.createdAt,
            updatedAt: userResult.data.updatedAt,
          };

          return UnifiedResponseHandler.success(roleInfo);
        } else {
          // Get all users with their roles
          const usersResult = await userDomainService.getAllUsers();
          if (!usersResult.success) {
            throw Errors.InternalServerError('Failed to retrieve users');
          }

          const usersWithRoles = usersResult.data.map((user: UserEntity) => ({
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }));

          return UnifiedResponseHandler.success(usersWithRoles);
        }

      case 'POST':
        const body = await UnifiedResponseHandler.parseJsonBody(request);
        const { targetUserId, newRole, reason } = body;

        if (!targetUserId || !newRole) {
          throw Errors.BadRequest('Target user ID and new role are required');
        }

        const validRoles = ['admin', 'parent', 'driver'];
        if (!validRoles.includes(newRole)) {
          throw Errors.BadRequest('Invalid role specified');
        }

        // Update user role
        const updateResult = await userDomainService.updateUserRole(
          targetUserId,
          newRole,
          currentUserId,
          reason,
        );

        if (!updateResult.success) {
          throw Errors.BadRequest(updateResult.error || 'Failed to update user role');
        }

        return UnifiedResponseHandler.success({
          message: 'User role updated successfully',
          userId: targetUserId,
          newRole,
          updatedBy: currentUserId,
          reason,
        });

      case 'PUT':
        if (!userId) {
          throw Errors.BadRequest('User ID is required');
        }

        const putBody = await UnifiedResponseHandler.parseJsonBody(request);
        const { isActive } = putBody;

        if (typeof isActive !== 'boolean') {
          throw Errors.BadRequest('isActive must be a boolean value');
        }

        // Update user active status
        const statusResult = await userDomainService.updateUserActiveStatus(
          userId,
          isActive,
          currentUserId,
        );

        if (!statusResult.success) {
          throw Errors.BadRequest(statusResult.error || 'Failed to update user status');
        }

        return UnifiedResponseHandler.success({
          message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
          userId,
          isActive,
          updatedBy: currentUserId,
        });

      case 'DELETE':
        if (!userId) {
          throw Errors.BadRequest('User ID is required');
        }

        // Soft delete user (deactivate)
        const deleteResult = await userDomainService.updateUserActiveStatus(
          userId,
          false,
          currentUserId,
        );

        if (!deleteResult.success) {
          throw Errors.BadRequest(deleteResult.error || 'Failed to deactivate user');
        }

        return UnifiedResponseHandler.success({
          message: 'User deactivated successfully',
          userId,
          deactivatedBy: currentUserId,
        });

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    logger.error('Error in admin role management function', { error });
    return handleError(error, request);
  }
}

// Register the function with middleware composition
const composedHandler = compose(
  requestId,
  requestLogging,
  corsMiddleware,
  authenticate,
  hasRole('group_admin' as UserRole),
  adminRoleManagementHandler,
);

app.http('admin-role-management', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'admin/role-management',
  authLevel: 'anonymous',
  handler: composedHandler,
});

export default adminRoleManagementHandler;
