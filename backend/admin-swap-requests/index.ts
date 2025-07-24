/**
 * Admin Swap Requests Management
 *
 * Migrated from JavaScript to TypeScript
 * Uses simplified business logic until TripDomainService is properly integrated
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface SwapRequest {
  id: string;
  originalAssignmentId: string;
  requestingDriverId: string;
  receivingDriverId: string;
  requestedDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
}

interface SwapRequestFilters {
  status?: string;
  userId?: string;
  adminView?: boolean;
}

interface SwapRequestBody {
  originalAssignmentId: string;
  requestingDriverId: string;
  receivingDriverId: string;
  requestedDate: string;
  reason?: string;
  status?: string;
  adminNotes?: string;
}

export async function adminSwapRequests(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Admin Swap Requests API called');

  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return UnifiedResponseHandler.preflight();
    }

    // Apply authentication middleware
    const authResponse = await authenticate(request, context);
    if (authResponse) {
      return authResponse;
    }

    // Check if user is authenticated
    if (!request.auth) {
      return UnifiedResponseHandler.authError('Authentication required');
    }

    const user = request.auth;
    const swapRequestId = request.params.id;

    // Validate admin access
    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      return UnifiedResponseHandler.forbiddenError('Admin access required');
    }

    switch (request.method) {
      case 'GET':
        if (swapRequestId) {
          return await getSwapRequest(swapRequestId);
        } else {
          return await getSwapRequests(request);
        }

      case 'POST':
        return await createSwapRequest(request);

      case 'PUT':
        if (!swapRequestId) {
          return UnifiedResponseHandler.validationError('Swap request ID is required');
        }
        return await updateSwapRequest(swapRequestId, request);

      default:
        return UnifiedResponseHandler.methodNotAllowedError(`Method ${request.method} not allowed`);
    }
  } catch (error) {
    context.log('Admin swap requests error:', error);
    return UnifiedResponseHandler.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function getSwapRequests(request: HttpRequest): Promise<HttpResponseInit> {
  const queryParams = Object.fromEntries(request.query.entries());
  const filters: SwapRequestFilters = {
    status: queryParams.status || undefined,
    userId: queryParams.userId || undefined,
    adminView: queryParams.adminView === 'true',
  };

  // Mock data for now
  const mockSwapRequests = [
    {
      id: '1',
      originalAssignmentId: 'assignment-1',
      requestingDriverId: 'user-1',
      receivingDriverId: 'user-2',
      requestedDate: new Date('2025-07-10'),
      reason: 'Emergency at work',
      status: 'pending' as const,
      createdAt: new Date('2025-07-04'),
      updatedAt: new Date('2025-07-04'),
      requestingDriver: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '555-1234',
      },
      receivingDriver: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phoneNumber: '555-5678',
      },
    },
  ];

  let filteredRequests = mockSwapRequests;

  if (filters.status) {
    filteredRequests = filteredRequests.filter((req) => req.status === filters.status);
  }

  if (filters.userId && !filters.adminView) {
    filteredRequests = filteredRequests.filter(
      (req) =>
        req.requestingDriverId === filters.userId || req.receivingDriverId === filters.userId,
    );
  }

  return UnifiedResponseHandler.success({
    swapRequests: filteredRequests,
    total: filteredRequests.length,
    filters,
  });
}

async function getSwapRequest(swapRequestId: string): Promise<HttpResponseInit> {
  // Mock single swap request
  const mockSwapRequest = {
    id: swapRequestId,
    originalAssignmentId: 'assignment-1',
    requestingDriverId: 'user-1',
    receivingDriverId: 'user-2',
    requestedDate: new Date('2025-07-10'),
    reason: 'Emergency at work',
    status: 'pending' as const,
    createdAt: new Date('2025-07-04'),
    updatedAt: new Date('2025-07-04'),
    requestingDriver: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '555-1234',
    },
    receivingDriver: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phoneNumber: '555-5678',
    },
  };

  return UnifiedResponseHandler.success(mockSwapRequest);
}

async function createSwapRequest(request: HttpRequest): Promise<HttpResponseInit> {
  const body = (await request.json()) as SwapRequestBody;

  // Validate required fields
  const requiredFields = [
    'originalAssignmentId',
    'requestingDriverId',
    'receivingDriverId',
    'requestedDate',
  ];

  for (const field of requiredFields) {
    if (!body[field as keyof SwapRequestBody]) {
      return UnifiedResponseHandler.validationError(`Missing required field: ${field}`);
    }
  }

  // Validate that users are not trying to swap with themselves
  if (body.requestingDriverId === body.receivingDriverId) {
    return UnifiedResponseHandler.validationError('Cannot create swap request with yourself');
  }

  // Create mock swap request
  const swapRequest = {
    id: `swap-${Date.now()}`,
    originalAssignmentId: body.originalAssignmentId,
    requestingDriverId: body.requestingDriverId,
    receivingDriverId: body.receivingDriverId,
    requestedDate: new Date(body.requestedDate),
    reason: body.reason || '',
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminNotes: body.adminNotes || '',
  };

  return UnifiedResponseHandler.success(swapRequest);
}

async function updateSwapRequest(
  swapRequestId: string,
  request: HttpRequest,
): Promise<HttpResponseInit> {
  const body = (await request.json()) as SwapRequestBody;

  // Mock updated swap request
  const updatedSwapRequest = {
    id: swapRequestId,
    originalAssignmentId: body.originalAssignmentId || 'assignment-1',
    requestingDriverId: body.requestingDriverId || 'user-1',
    receivingDriverId: body.receivingDriverId || 'user-2',
    requestedDate: body.requestedDate ? new Date(body.requestedDate) : new Date('2025-07-10'),
    reason: body.reason || 'Updated reason',
    status: body.status || ('pending' as const),
    createdAt: new Date('2025-07-04'),
    updatedAt: new Date(),
    adminNotes: body.adminNotes || '',
  };

  return UnifiedResponseHandler.success(updatedSwapRequest);
}
