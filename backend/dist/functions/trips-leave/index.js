"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const monitoring_1 = require("../../utils/monitoring");
async function leaveTripHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    const userId = request.user.userId;
    logger.info('Processing leave trip request', { userId });
    // Get validated path params
    const tripId = request.validatedParams?.tripId;
    try {
        // Check if trip exists with performance tracking
        const trip = await (0, monitoring_1.trackExecutionTime)('getTripById', () => container_1.container.tripService.getTripById(tripId || ''), 'TripService');
        if (!trip) {
            logger.warn('Trip not found', { tripId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Trip not found'
                }
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
                }
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
                }
            };
        }
        // Remove passenger with performance tracking
        const updatedTrip = await (0, monitoring_1.trackExecutionTime)('removePassenger', () => container_1.container.tripService.removePassenger(tripId || '', userId), 'TripService');
        logger.info('User successfully left trip', { tripId, userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: updatedTrip,
                message: 'Successfully left the trip'
            }
        };
    }
    catch (error) {
        logger.error('Error leaving trip', { error: error.message, tripId, userId });
        return {
            status: 400,
            jsonBody: {
                success: false,
                error: error.message
            }
        };
    }
}
functions_1.app.http('trips-leave', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'trips/{tripId}/leave',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, validation_middleware_1.validatePathParams)(shared_1.tripIdParamSchema, (0, validation_middleware_1.extractPathParam)('tripId')))(leaveTripHandler)
});
//# sourceMappingURL=index.js.map