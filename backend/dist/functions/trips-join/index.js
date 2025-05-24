"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const monitoring_1 = require("../../utils/monitoring");
async function joinTripHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    const userId = request.user.userId;
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
            }
        };
    }
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
        // Check if user is trying to join their own trip
        if (trip.driverId === userId) {
            logger.warn('User attempted to join their own trip', { tripId, userId });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Cannot join your own trip'
                }
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
                }
            };
        }
        // Add passenger with performance tracking
        const updatedTrip = await (0, monitoring_1.trackExecutionTime)('addPassenger', () => container_1.container.tripService.addPassenger(tripId || '', userId, pickupLocation), 'TripService');
        logger.info('User successfully joined trip', { tripId, userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: updatedTrip,
                message: 'Successfully joined the trip'
            }
        };
    }
    catch (error) {
        logger.error('Error joining trip', { error: error.message, tripId, userId });
        return {
            status: 400,
            jsonBody: {
                success: false,
                error: error.message
            }
        };
    }
}
functions_1.app.http('trips-join', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips/{tripId}/join',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, validation_middleware_1.validatePathParams)(shared_1.tripIdParamSchema, (0, validation_middleware_1.extractPathParam)('tripId')), (0, middleware_1.validateBody)(shared_1.joinTripParamSchema))(joinTripHandler)
});
//# sourceMappingURL=index.js.map