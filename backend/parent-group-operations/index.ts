import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { groupDomainService } from '../src/services/domains/group-domain.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schemas
const GroupSearchSchema = z.object({
  schoolId: z.string().optional(),
  location: z
    .object({
      address: z.string(),
      maxDistance: z.number().optional(),
    })
    .optional(),
  maxMembers: z.number().optional(),
  hasOpenings: z.boolean().optional(),
  scheduleCompatibility: z.array(z.string()).optional(),
});

const JoinRequestSchema = z.object({
  groupId: z.string(),
  message: z.string().optional(),
  childrenIds: z.array(z.string()).optional(),
});

// Handler function
async function parentGroupHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Parent group request', { method, action, userId });

    switch (method) {
      case 'GET':
        if (action === 'search') {
          return await handleGroupSearch(request, userId, context);
        } else {
          return await handleGetUserGroups(userId, context);
        }

      case 'POST':
        if (action === 'join') {
          return await handleJoinRequest(request, userId, context);
        } else {
          return await handleCreateGroup(request, userId, context);
        }

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in parent group handler', error);
    return handleError(error, request);
  }
}

// GET: Search for groups or get user's groups
async function handleGroupSearch(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    schoolId: request.query.get('schoolId') || undefined,
    maxMembers: request.query.get('maxMembers')
      ? parseInt(request.query.get('maxMembers')!)
      : undefined,
    hasOpenings: request.query.get('hasOpenings') === 'true',
    location: request.query.get('address')
      ? {
          address: request.query.get('address')!,
          maxDistance: request.query.get('maxDistance')
            ? parseFloat(request.query.get('maxDistance')!)
            : undefined,
        }
      : undefined,
  };

  const result = await groupDomainService.discoverGroups(query, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to search groups');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Groups found successfully',
    },
  };
}

// GET: Get user's current groups
async function handleGetUserGroups(
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // TODO: Implement getUserGroups in domain service
  // For now, return empty array
  return {
    status: 200,
    jsonBody: {
      success: true,
      data: [],
      message: 'User groups retrieved successfully',
    },
  };
}

// POST: Create a new group (parents can create groups)
async function handleCreateGroup(
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

  const result = await groupDomainService.createGroup(groupData, 'parent' as UserRole);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create group');
  }

  context.log('Group created by parent', { groupId: result.data?.id, userId });

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Group created successfully',
    },
  };
}

// POST: Request to join a group
async function handleJoinRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const joinRequest = {
    groupId: body.groupId,
    userId: userId,
    message: body.message,
    childrenIds: body.childrenIds,
  };

  const result = await groupDomainService.requestJoinGroup(joinRequest);

  if (!result.success) {
    throw new Error(result.error || 'Failed to process join request');
  }

  context.log('Join request submitted', { groupId: body.groupId, userId });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Join request submitted successfully',
    },
  };
}

// Define validation schemas for different actions
const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  schoolId: z.string().min(1),
  maxMembers: z.number().min(2).max(20),
  addresses: z.array(z.string()).optional(),
  scheduleTemplate: z.string().optional(),
});

// Register the function with middleware
app.http('parent-group-operations', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'parent/groups',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(z.union([CreateGroupSchema, JoinRequestSchema]).optional()),
  )(parentGroupHandler),
});
