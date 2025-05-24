import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, Trip, JoinTripRequest, tripIdParamSchema, joinTripParamSchema } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, AuthenticatedRequest, validateBody } from '../../middleware';
import { validatePathParams, extractPathParam } from '../../middleware/validation.middleware';
import { trackExecutionTime } from '../../utils/monitoring';

interface ExtendedRequest extends AuthenticatedRequest {
  validatedBody?: JoinTripRequest;
  validatedParams?: { tripId: string };
}

async function joinTripHandler(
  request: ExtendedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  const userId = request.user!.userId;
  logger.info('Processing join trip request', { userId });
  
  // Get validated path and body params
  const tripId = request.validatedParams?.tripId;
  const { pickupLocation } = request.validatedBody || {};

  if (!pickupLocation || pickupLocation.trim().length === 0) {
    logger.warn('Missing pickup location in request');
    return {
      status: 400,
      jsonBody: {
        success: false,
        error: 'Pickup location is required'
      } as ApiResponse
    };
  }

  try {
    // Check if trip exists with performance tracking
    const trip = await trackExecutionTime('getTripById', 
      () => container.tripService.getTripById(tripId || ''),
      'TripService'
    );
    
    if (!trip) {
      logger.warn('Trip not found', { tripId });
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Trip not found'
        } as ApiResponse
      };
    }

    // Check if user is trying to join their own trip
    if (trip.driverId === userId) {
      logger.warn('User attempted to join their own trip', { tripId, userId });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Cannot join your own trip'
        } as ApiResponse
      };
    }

    // Check trip status
    if (trip.status !== 'planned') {
      logger.warn('User attempted to join a non-planned trip', { tripId, status: trip.status });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Can only join planned trips'
        } as ApiResponse
      };
    }

    // Add passenger with performance tracking
    const updatedTrip = await trackExecutionTime('addPassenger', 
      () => container.tripService.addPassenger(tripId || '', userId, pickupLocation),
      'TripService'
    );
    
    logger.info('User successfully joined trip', { tripId, userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: updatedTrip,
        message: 'Successfully joined the trip'
      } as ApiResponse<Trip>
    };
  } catch (error: any) {
    logger.error('Error joining trip', { error: error.message, tripId, userId });
    return {
      status: 400,
      jsonBody: {
        success: false,
        error: error.message
      } as ApiResponse
    };
  }
}

app.http('trips-join', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{tripId}/join',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validatePathParams(tripIdParamSchema, extractPathParam('tripId')),
    validateBody(joinTripParamSchema)
  )(joinTripHandler)
});
