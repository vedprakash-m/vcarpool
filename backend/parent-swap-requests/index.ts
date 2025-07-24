/**
 * Parent Swap Requests
 *
 * Migrated from JavaScript to TypeScript
 * Handles trip swap requests between parents
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { databaseService } from '../src/services/database.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const CreateSwapRequestSchema = z.object({
  scheduleId: z.string(),
  originalAssignmentId: z.string(),
  proposedChange: z.object({
    date: z.string(),
    role: z.enum(['driver', 'passenger']),
    timeSlot: z.enum(['morning', 'afternoon']),
  }),
  targetParentId: z.string().optional(),
  reason: z.string(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const RespondToSwapSchema = z.object({
  swapRequestId: z.string(),
  response: z.enum(['accept', 'decline']),
  responseMessage: z.string().optional(),
});

interface SwapRequest {
  id: string;
  scheduleId: string;
  requesterId: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  originalAssignmentId: string;
  originalAssignment: any;
  proposedChange: {
    date: string;
    role: 'driver' | 'passenger';
    timeSlot: 'morning' | 'afternoon';
  };
  targetParentId?: string;
  targetParent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reason: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'declined' | 'auto_accepted' | 'expired';
  autoAcceptAt?: string;
  respondedAt?: string;
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data - in production this would come from database
const mockSwapRequests: SwapRequest[] = [];

// Handler function
async function parentSwapRequestsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Parent swap requests', { method, action, userId });

    // Verify user is a parent
    const user = await databaseService.getUserById(userId);
    if (!user) {
      throw Errors.Unauthorized('User not found');
    }

    if (user.role !== 'parent') {
      throw Errors.Forbidden('Only parents can manage swap requests');
    }

    switch (method) {
      case 'GET':
        if (!action) {
          return await handleGetSwapRequests(request, userId, context);
        }
        break;

      case 'POST':
        if (action === 'create') {
          return await handleCreateSwapRequest(request, userId, context);
        }
        if (action === 'respond') {
          return await handleRespondToSwap(request, userId, context);
        }
        break;

      case 'DELETE':
        if (action === 'cancel') {
          return await handleCancelSwapRequest(request, userId, context);
        }
        break;
    }

    throw Errors.BadRequest(`Method ${method} with action ${action} not allowed`);
  } catch (error) {
    context.log('Parent swap requests error:', error);
    return handleError(error, request);
  }
}

async function handleGetSwapRequests(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const scheduleId = request.query.get('scheduleId');
    const status = request.query.get('status');

    // Get swap requests for user
    let userRequests = mockSwapRequests.filter(
      (r) => r.requesterId === userId || r.targetParentId === userId,
    );

    if (scheduleId) {
      userRequests = userRequests.filter((r) => r.scheduleId === scheduleId);
    }

    if (status) {
      userRequests = userRequests.filter((r) => r.status === status);
    }

    // Sort by created date (newest first)
    userRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          requests: userRequests,
          total: userRequests.length,
        },
        message: 'Swap requests retrieved successfully',
      },
    };
  } catch (error) {
    context.log('Get swap requests error:', error);
    throw error;
  }
}

async function handleCreateSwapRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validatedData = CreateSwapRequestSchema.parse(body);

    context.log('Creating swap request', { userId, scheduleId: validatedData.scheduleId });

    // Get user details
    const user = await databaseService.getUserById(userId);
    if (!user) {
      throw Errors.Unauthorized('User not found');
    }

    // Create swap request
    const swapRequest: SwapRequest = {
      id: uuidv4(),
      scheduleId: validatedData.scheduleId,
      requesterId: userId,
      requester: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      originalAssignmentId: validatedData.originalAssignmentId,
      originalAssignment: {
        // This would be populated with actual assignment data
        id: validatedData.originalAssignmentId,
        date: validatedData.proposedChange.date,
      },
      proposedChange: validatedData.proposedChange,
      targetParentId: validatedData.targetParentId,
      reason: validatedData.reason,
      priority: validatedData.priority,
      status: 'pending',
      autoAcceptAt: calculateAutoAcceptTime(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store the swap request (mock implementation)
    mockSwapRequests.push(swapRequest);

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: {
          swapRequest,
        },
        message: 'Swap request created successfully',
      },
    };
  } catch (error) {
    context.log('Create swap request error:', error);
    throw error;
  }
}

async function handleRespondToSwap(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validatedData = RespondToSwapSchema.parse(body);

    context.log('Responding to swap request', {
      userId,
      swapRequestId: validatedData.swapRequestId,
    });

    // Find the swap request
    const swapRequestIndex = mockSwapRequests.findIndex(
      (r) => r.id === validatedData.swapRequestId,
    );

    if (swapRequestIndex === -1) {
      throw Errors.NotFound('Swap request not found');
    }

    const swapRequest = mockSwapRequests[swapRequestIndex];

    // Verify user can respond to this request
    if (swapRequest.targetParentId && swapRequest.targetParentId !== userId) {
      throw Errors.Forbidden('You are not authorized to respond to this swap request');
    }

    if (swapRequest.status !== 'pending') {
      throw Errors.BadRequest('This swap request has already been responded to');
    }

    // Update the swap request
    const updatedSwapRequest: SwapRequest = {
      ...swapRequest,
      status: validatedData.response === 'accept' ? 'accepted' : 'declined',
      respondedAt: new Date().toISOString(),
      responseMessage: validatedData.responseMessage || '',
      updatedAt: new Date().toISOString(),
    };

    mockSwapRequests[swapRequestIndex] = updatedSwapRequest;

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          swapRequest: updatedSwapRequest,
        },
        message: `Swap request ${validatedData.response}ed successfully`,
      },
    };
  } catch (error) {
    context.log('Respond to swap error:', error);
    throw error;
  }
}

async function handleCancelSwapRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const swapRequestId = request.query.get('swapRequestId');

    if (!swapRequestId) {
      throw Errors.BadRequest('Swap request ID is required');
    }

    // Find the swap request
    const swapRequestIndex = mockSwapRequests.findIndex((r) => r.id === swapRequestId);

    if (swapRequestIndex === -1) {
      throw Errors.NotFound('Swap request not found');
    }

    const swapRequest = mockSwapRequests[swapRequestIndex];

    // Verify user owns this request
    if (swapRequest.requesterId !== userId) {
      throw Errors.Forbidden('You can only cancel your own swap requests');
    }

    if (swapRequest.status !== 'pending') {
      throw Errors.BadRequest('Only pending swap requests can be cancelled');
    }

    // Remove the swap request
    mockSwapRequests.splice(swapRequestIndex, 1);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Swap request cancelled successfully',
      },
    };
  } catch (error) {
    context.log('Cancel swap request error:', error);
    throw error;
  }
}

// Helper functions
function calculateAutoAcceptTime(): string {
  // Auto-accept time is typically 24-48 hours before the scheduled trip
  const autoAcceptDate = new Date();
  autoAcceptDate.setDate(autoAcceptDate.getDate() + 2); // 2 days from now
  autoAcceptDate.setHours(17, 0, 0, 0); // 5 PM
  return autoAcceptDate.toISOString();
}

// Register the function with middleware
app.http('parent-swap-requests', {
  methods: ['GET', 'POST', 'DELETE'],
  authLevel: 'anonymous',
  route: 'parent/swap-requests',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(z.union([CreateSwapRequestSchema, RespondToSwapSchema]).optional()),
  )(parentSwapRequestsHandler),
});
