"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const middleware_1 = require("../../middleware");
const container_1 = require("../../container");
const monitoring_1 = require("../../utils/monitoring");
async function createTripHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    // Log the operation start
    logger.info(`Creating new trip`, { userId: request.user?.userId });
    const userId = request.user.userId;
    try {
        // Parse request body
        const bodyText = await request.text();
        const tripData = JSON.parse(bodyText);
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
                }
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
                }
            };
        }
        // Get user information to send email notification - track performance
        const user = await (0, monitoring_1.trackExecutionTime)('getUserById', () => container_1.container.userService.getUserById(userId), 'UserService');
        // Create trip with performance tracking
        const trip = await (0, monitoring_1.trackExecutionTime)('createTrip', () => container_1.container.tripService.createTrip(userId, tripData, user || undefined), 'TripService');
        logger.info('Trip created successfully', { tripId: trip.id });
        return {
            status: 201,
            jsonBody: {
                success: true,
                data: trip,
                message: 'Trip created successfully'
            }
        };
    }
    catch (error) {
        logger.error('Error creating trip', error);
        throw error; // Let the error middleware handle the error
    }
}
functions_1.app.http('trips-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.createTripValidation))(createTripHandler)
});
//# sourceMappingURL=index.js.map