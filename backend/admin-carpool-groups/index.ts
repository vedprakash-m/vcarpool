import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { groupDomainService } from '../src/services/domains/group-domain.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schemas
const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  schoolId: z.string().min(1),
  maxMembers: z.number().min(2).max(20),
  addresses: z.array(z.string()).optional(),
  scheduleTemplate: z.string().optional(),
});

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  maxMembers: z.number().min(2).max(20).optional(),
  addresses: z.array(z.string()).optional(),
  scheduleTemplate: z.string().optional(),
});

// Handler function
async function adminCarpoolGroupsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const groupId = request.params.groupId;
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Admin carpool groups request', { method, groupId, userId });

    switch (method) {
      case 'GET':
        return await handleGetRequest(groupId, userId, context);

      case 'POST':
        return await handlePostRequest(request, userId, context);

      case 'PUT':
        return await handlePutRequest(groupId, request, userId, context);

      case 'DELETE':
        return await handleDeleteRequest(groupId, userId, context);

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in admin carpool groups handler', error);
    return handleError(error, request);
  }
}

// GET: Retrieve groups or specific group details
async function handleGetRequest(
  groupId: string | undefined,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  if (groupId) {
    // Get specific group details
    const result = await groupDomainService.getGroupDetails(groupId, userId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to get group details');
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result.data,
        message: 'Group details retrieved successfully',
      },
    };
  } else {
    // Get all groups (admin only)
    const result = await groupDomainService.getGroups(userId, {
      limit: 50, // reasonable default
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get groups');
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result.data,
        message: 'Groups retrieved successfully',
      },
    };
  }
}

// POST: Create new group
async function handlePostRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const groupData = {
    name: body.name,
    description: body.description,
    schoolId: body.schoolId,
    maxMembers: body.maxMembers,
    createdBy: userId,
    addresses: body.addresses,
    scheduleTemplate: body.scheduleTemplate,
  };

  const result = await groupDomainService.createGroup(groupData, request.auth!.role);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create group');
  }

  context.log('Group created successfully', { groupId: result.data?.id });

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Group created successfully',
    },
  };
}

// PUT: Update existing group
async function handlePutRequest(
  groupId: string | undefined,
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  if (!groupId) {
    throw Errors.BadRequest('Group ID is required for update operations');
  }

  const body = request.validated?.body;

  const result = await groupDomainService.updateGroup(
    groupId,
    {
      name: body.name,
      description: body.description,
      maxMembers: body.maxMembers,
      addresses: body.addresses,
      scheduleTemplate: body.scheduleTemplate,
    },
    userId,
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to update group');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Group updated successfully',
    },
  };
}

// DELETE: Archive/delete group
async function handleDeleteRequest(
  groupId: string | undefined,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  if (!groupId) {
    throw Errors.BadRequest('Group ID is required for delete operations');
  }

  const result = await groupDomainService.archiveGroup(groupId, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to archive group');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      message: result.message || 'Group archived successfully',
    },
  };
}

// Register the function with middleware
app.http('admin-carpool-groups', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'admin/groups/{groupId?}',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    hasRole('group_admin' as UserRole), // Require group admin role
    validateBody(z.union([CreateGroupSchema, UpdateGroupSchema]).optional()),
  )(adminCarpoolGroupsHandler),
});
