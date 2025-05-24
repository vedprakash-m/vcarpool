import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, Trip, tripIdParamSchema } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, AuthenticatedRequest } from '../../middleware';
import { validatePathParams, extractPathParam } from '../../middleware/validation.middleware';
import { trackExecutionTime } from '../../utils/monitoring';

interface ExtendedRequest extends AuthenticatedRequest {
  validatedParams?: { tripId: string };
}

async function leaveTripHandler(
  request: ExtendedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  const userId = request.user!.userId;
  logger.info('Processing leave trip request', { userId });
  
  // Get validated path params
  const tripId = request.validatedParams?.tripId;

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

    // Check if user is the driver
    if (trip.driverId === userId) {
      logger.warn('Driver attempted to leave own trip', { tripId, userId });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Driver cannot leave their own trip. Cancel the trip instead.'
        } as ApiResponse
      };
    }

    // Check trip status
    if (trip.status !== 'planned') {
      logger.warn('User attempted to leave non-planned trip', { tripId, status: trip.status });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Can only leave planned trips'
        } as ApiResponse
      };
    }

    // Remove passenger with performance tracking
    const updatedTrip = await trackExecutionTime('removePassenger', 
      () => container.tripService.removePassenger(tripId || '', userId),
      'TripService'
    );
    
    logger.info('User successfully left trip', { tripId, userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: updatedTrip,
        message: 'Successfully left the trip'
      } as ApiResponse<Trip>
    };
  } catch (error: any) {
    logger.error('Error leaving trip', { error: error.message, tripId, userId });
    return {
      status: 400,
      jsonBody: {
        success: false,
        error: error.message
      } as ApiResponse
    };
  }
}

app.http('trips-leave', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{tripId}/leave',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validatePathParams(tripIdParamSchema, extractPathParam('tripId'))
  )(leaveTripHandler)
});
