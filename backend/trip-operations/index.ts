import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { tripDomainService } from '../src/services/domains/trip-domain.service';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schemas
const TripCreationSchema = z.object({
  groupId: z.string(),
  driverId: z.string(),
  pickupTime: z.string().transform((str) => new Date(str)),
  dropoffTime: z.string().transform((str) => new Date(str)),
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  maxPassengers: z.number().min(1).max(8),
  passengers: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

const TripUpdateSchema = z.object({
  driverId: z.string().optional(),
  pickupTime: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  dropoffTime: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
  maxPassengers: z.number().min(1).max(8).optional(),
  passengers: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).optional(),
});

const SwapRequestSchema = z.object({
  tripId: z.string(),
  toUserId: z.string(),
  reason: z.string(),
  requestedDate: z.string().transform((str) => new Date(str)),
});

// Handler function
async function tripHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const tripId = request.params.tripId;
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Trip request', { method, action, tripId, userId });

    switch (method) {
      case 'GET':
        if (action === 'search') {
          return await handleTripSearch(request, userId, context);
        } else if (action === 'stats') {
          return await handleTripStats(request, userId, context);
        } else if (tripId) {
          return await handleGetTrip(tripId, userId, context);
        } else {
          return await handleTripSearch(request, userId, context);
        }

      case 'POST':
        if (action === 'swap-request') {
          return await handleSwapRequest(request, userId, context);
        } else {
          return await handleCreateTrip(request, userId, context);
        }

      case 'PUT':
        if (!tripId) {
          throw Errors.BadRequest('Trip ID is required for update operations');
        }
        return await handleUpdateTrip(tripId, request, userId, context);

      case 'DELETE':
        if (!tripId) {
          throw Errors.BadRequest('Trip ID is required for delete operations');
        }
        return await handleDeleteTrip(tripId, userId, context);

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in trip handler', error);
    return handleError(error, request);
  }
}

// GET: Search trips
async function handleTripSearch(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const query = {
    groupId: request.query.get('groupId') || undefined,
    driverId: request.query.get('driverId') || undefined,
    dateRange:
      request.query.get('startDate') && request.query.get('endDate')
        ? {
            start: new Date(request.query.get('startDate')!),
            end: new Date(request.query.get('endDate')!),
          }
        : undefined,
    status: request.query.get('status') ? request.query.get('status')!.split(',') : undefined,
    includePast: request.query.get('includePast') === 'true',
  };

  const result = await tripDomainService.searchTrips(query, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to search trips');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Trips retrieved successfully',
    },
  };
}

// GET: Get trip statistics
async function handleTripStats(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');

  if (!groupId) {
    throw Errors.BadRequest('groupId is required for statistics');
  }

  const result = await tripDomainService.getTripStats(groupId, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to get trip statistics');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Trip statistics retrieved successfully',
    },
  };
}

// GET: Get specific trip
async function handleGetTrip(
  tripId: string,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // This would need a getTrip method in the domain service
  // For now, return a placeholder
  return {
    status: 200,
    jsonBody: {
      success: true,
      data: null,
      message: 'Trip details would be retrieved here',
    },
  };
}

// POST: Create new trip
async function handleCreateTrip(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const tripData = {
    groupId: body.groupId,
    driverId: body.driverId,
    pickupTime: body.pickupTime,
    dropoffTime: body.dropoffTime,
    pickupAddress: body.pickupAddress,
    dropoffAddress: body.dropoffAddress,
    maxPassengers: body.maxPassengers,
    passengers: body.passengers,
    notes: body.notes,
    isRecurring: body.isRecurring,
    recurringPattern: body.recurringPattern,
  };

  const result = await tripDomainService.createTrip(tripData, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create trip');
  }

  context.log('Trip created', { tripId: result.data?.id, userId });

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Trip created successfully',
    },
  };
}

// POST: Create swap request
async function handleSwapRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const swapRequest = {
    tripId: body.tripId,
    fromUserId: userId,
    toUserId: body.toUserId,
    reason: body.reason,
    requestedDate: body.requestedDate,
  };

  const result = await tripDomainService.createSwapRequest(swapRequest);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create swap request');
  }

  context.log('Swap request created', { tripId: body.tripId, fromUserId: userId });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Swap request created successfully',
    },
  };
}

// PUT: Update trip
async function handleUpdateTrip(
  tripId: string,
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const result = await tripDomainService.updateTrip(tripId, body, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to update trip');
  }

  context.log('Trip updated', { tripId, userId });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Trip updated successfully',
    },
  };
}

// DELETE: Cancel/delete trip
async function handleDeleteTrip(
  tripId: string,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const result = await tripDomainService.updateTrip(tripId, { status: 'cancelled' }, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to cancel trip');
  }

  context.log('Trip cancelled', { tripId, userId });

  return {
    status: 200,
    jsonBody: {
      success: true,
      message: 'Trip cancelled successfully',
    },
  };
}

// Register the function with middleware
app.http('trip-operations', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{tripId?}',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(z.union([TripCreationSchema, TripUpdateSchema, SwapRequestSchema]).optional()),
  )(tripHandler),
});
