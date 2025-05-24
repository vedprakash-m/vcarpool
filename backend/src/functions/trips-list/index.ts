import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PaginatedResponse, Trip, TripStatus, tripQuerySchema } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, AuthenticatedRequest } from '../../middleware';
import { validateQueryParams } from '../../middleware/validation.middleware';
import { trackExecutionTime } from '../../utils/monitoring';

async function listTripsHandler(
  request: AuthenticatedRequest & { validatedQuery?: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  // Log the operation start
  logger.info('Listing trips', { userId: request.user?.userId });

  // Get validated query params
  const queryParams = request.validatedQuery || {};
  const driverId = queryParams.driverId;
  const passengerId = queryParams.passengerId;
  const status = queryParams.status as TripStatus;
  const date = queryParams.date;
  const page = queryParams.page || 1;
  const limit = queryParams.limit || 20;
  const offset = (page - 1) * limit;

  // If no specific filters, default to showing user's trips
  const userId = request.user!.userId;
  const finalDriverId = driverId || (passengerId ? undefined : userId);
  const finalPassengerId = passengerId || (driverId ? undefined : userId);

  try {
    // Get trips with performance tracking
    const result = await trackExecutionTime('getTrips', 
      () => container.tripService.getTrips({
        driverId: finalDriverId,
        passengerId: finalPassengerId,
        status,
        date,
        limit,
        offset
      }),
      'TripService'
    );

    const { trips, total } = result;
    const totalPages = Math.ceil(total / limit);

    logger.info('Trips retrieved successfully', { 
      userId: request.user?.userId, 
      count: trips.length,
      total
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: trips,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      } as PaginatedResponse<Trip>
    };
  } catch (error) {
    logger.error('Error listing trips', { error });
    throw error; // Let the error handler middleware handle it
  }
}

app.http('trips-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'trips',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validateQueryParams(tripQuerySchema)
  )(listTripsHandler)
});
