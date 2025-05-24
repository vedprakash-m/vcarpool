import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, Trip, CreateTripRequest, createTripValidation } from '@vcarpool/shared';
import { compose, cors, errorHandler, authenticate, validateBody, AuthenticatedRequest } from '../../middleware';
import { container } from '../../container';
import { trackExecutionTime } from '../../utils/monitoring';

async function createTripHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ('setContext' in logger) {
    (logger as any).setContext(context);
  }
  
  // Log the operation start
  logger.info(`Creating new trip`, { userId: request.user?.userId });
  
  const userId = request.user!.userId;
  
  try {
    // Parse request body
    const bodyText = await request.text();
    const tripData = JSON.parse(bodyText) as CreateTripRequest;

    // Log the parsed data (without sensitive info)
    logger.debug('Trip data parsed', { 
      destination: tripData.destination,
      date: tripData.date,
      maxPassengers: tripData.maxPassengers
    });

    // Validate that the trip date is in the future
    const tripDate = new Date(tripData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tripDate < today) {
      logger.warn('Attempted to create trip for past date', { providedDate: tripData.date });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Cannot create trips for past dates'
        } as ApiResponse
      };
    }

    // Validate departure time is before arrival time
    const [depHour, depMin] = tripData.departureTime.split(':').map(Number);
    const [arrHour, arrMin] = tripData.arrivalTime.split(':').map(Number);
    const depTimeMinutes = depHour * 60 + depMin;
    const arrTimeMinutes = arrHour * 60 + arrMin;

    if (depTimeMinutes >= arrTimeMinutes) {
      logger.warn('Invalid time range', { departureTime: tripData.departureTime, arrivalTime: tripData.arrivalTime });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Departure time must be before arrival time'
        } as ApiResponse
      };
    }

    // Get user information to send email notification - track performance
    const user = await trackExecutionTime('getUserById', 
      () => container.userService.getUserById(userId),
      'UserService'
    );
    
    // Create trip with performance tracking
    const trip = await trackExecutionTime('createTrip', 
      () => container.tripService.createTrip(userId, tripData, user || undefined),
      'TripService'
    );
    
    logger.info('Trip created successfully', { tripId: trip.id });
    
    return {
      status: 201,
      jsonBody: {
        success: true,
        data: trip,
        message: 'Trip created successfully'
      } as ApiResponse<Trip>
    };
  } catch (error) {
    logger.error('Error creating trip', error);
    throw error; // Let the error middleware handle the error
  }
}

app.http('trips-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validateBody(createTripValidation)
  )(createTripHandler)
});
