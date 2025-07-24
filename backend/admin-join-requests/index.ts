/**
 * Admin Join Requests Management
 *
 * Migrated from JavaScript to TypeScript
 * Uses GroupDomainService for unified business logic
 */

import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { container } from '../src/container';
import { GroupDomainService } from '../src/services/domains/group-domain.service';
import { authenticateUser } from '../src/middleware';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserRole } from '@carpool/shared';
import { ILogger } from '../src/utils/logger';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest,
): Promise<void> {
  const logger = container.get<ILogger>('Logger');
  const groupDomainService = container.get<GroupDomainService>('GroupDomainService');
  const responseHandler = new UnifiedResponseHandler(logger);

  try {
    logger.info('Admin join requests request received', {
      method: req.method,
      url: req.url,
      headers: req.headers,
    });

    // Authentication check
    const authResult = await authenticateUser(req, logger);
    if (!authResult.success) {
      logger.warn('Authentication failed for admin join requests');
      context.res = responseHandler.unauthorized(authResult.message);
      return;
    }

    // Authorization check - only admins can manage join requests
    if (authResult.user.role !== UserRole.ADMIN) {
      logger.warn('Unauthorized access attempt to admin join requests', {
        userId: authResult.user.id,
        role: authResult.user.role,
      });
      context.res = responseHandler.forbidden('Admin access required');
      return;
    }

    const method = req.method?.toUpperCase();
    const groupId = req.query?.groupId;
    const requestId = req.query?.requestId;

    switch (method) {
      case 'GET':
        if (groupId) {
          // Get join requests for a specific group
          const requests = await groupDomainService.getJoinRequests(groupId);
          context.res = responseHandler.success(requests);
        } else {
          // Get all join requests (admin view)
          const allRequests = await groupDomainService.getAllJoinRequests();
          context.res = responseHandler.success(allRequests);
        }
        break;

      case 'POST':
        if (!requestId) {
          context.res = responseHandler.badRequest('Request ID is required');
          return;
        }

        const action = req.body?.action;
        if (!action || !['approve', 'reject'].includes(action)) {
          context.res = responseHandler.badRequest('Valid action (approve/reject) is required');
          return;
        }

        if (action === 'approve') {
          const result = await groupDomainService.approveJoinRequest(requestId, authResult.user.id);
          context.res = responseHandler.success(result);
        } else {
          const rejectionReason = req.body?.reason || 'No reason provided';
          const result = await groupDomainService.rejectJoinRequest(
            requestId,
            authResult.user.id,
            rejectionReason,
          );
          context.res = responseHandler.success(result);
        }
        break;

      case 'PUT':
        if (!requestId) {
          context.res = responseHandler.badRequest('Request ID is required');
          return;
        }

        const updateData = req.body;
        const result = await groupDomainService.updateJoinRequestStatus(requestId, updateData);
        context.res = responseHandler.success(result);
        break;

      case 'DELETE':
        if (!requestId) {
          context.res = responseHandler.badRequest('Request ID is required');
          return;
        }

        await groupDomainService.deleteJoinRequest(requestId);
        context.res = responseHandler.success({ message: 'Join request deleted successfully' });
        break;

      default:
        context.res = responseHandler.badRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    logger.error('Error in admin join requests function', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    context.res = responseHandler.internalError('Internal server error');
  }
};

export default httpTrigger;
