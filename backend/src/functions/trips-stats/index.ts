import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse } from '@vcarpool/shared';
import { container } from '../../container';
import { compose, cors, errorHandler, authenticate, AuthenticatedRequest } from '../../middleware';
import { validateQueryParams } from '../../middleware/validation.middleware';
import { trackExecutionTime } from '../../utils/monitoring';

interface TripStats {
  totalTrips: number;
  tripsAsDriver: number;
  tripsAsPassenger: number;
  totalDistance: number;
  costSavings: number;
  upcomingTrips: number;
}

async function getTripStatsHandler(
  request: AuthenticatedRequest & { validatedQuery?: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  const userId = request.user!.userId;
  
  // Get query parameters (if any)
  const timeRange = request.query?.get('timeRange') || 'all';
  
  // Log the operation start
  logger.info('Retrieving trip statistics', { userId, timeRange });

  try {
    // Get basic trip stats with performance tracking
    const stats = await trackExecutionTime('getTripStats', 
      () => container.tripService.getTripStats(userId),
      'TripService'
    );
    
    // Get upcoming trips count with performance tracking
    const upcomingTrips = await trackExecutionTime('getUserUpcomingTrips', 
      () => container.tripService.getUserUpcomingTrips(userId),
      'TripService'
    );

    const tripStats: TripStats = {
      ...stats,
      upcomingTrips: upcomingTrips.length
    };

    logger.info('Trip statistics retrieved successfully', { userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: tripStats
      } as ApiResponse<TripStats>
    };
  } catch (error) {
    logger.error('Error retrieving trip statistics', { userId, error });
    throw error; // Let the error handler middleware handle it
  }
}

app.http('trips-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'trips/stats',
  handler: compose(
    cors,
    errorHandler,
    authenticate
  )(getTripStatsHandler)
});
