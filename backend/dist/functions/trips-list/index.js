"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const monitoring_1 = require("../../utils/monitoring");
async function listTripsHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    // Log the operation start
    logger.info('Listing trips', { userId: request.user?.userId });
    // Get validated query params
    const queryParams = request.validatedQuery || {};
    const driverId = queryParams.driverId;
    const passengerId = queryParams.passengerId;
    const status = queryParams.status;
    const date = queryParams.date;
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 20;
    const offset = (page - 1) * limit;
    // If no specific filters, default to showing user's trips
    const userId = request.user.userId;
    const finalDriverId = driverId || (passengerId ? undefined : userId);
    const finalPassengerId = passengerId || (driverId ? undefined : userId);
    try {
        // Get trips with performance tracking
        const result = await (0, monitoring_1.trackExecutionTime)('getTrips', () => container_1.container.tripService.getTrips({
            driverId: finalDriverId,
            passengerId: finalPassengerId,
            status,
            date,
            limit,
            offset
        }), 'TripService');
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
            }
        };
    }
    catch (error) {
        logger.error('Error listing trips', { error });
        throw error; // Let the error handler middleware handle it
    }
}
functions_1.app.http('trips-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'trips',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, validation_middleware_1.validateQueryParams)(shared_1.tripQuerySchema))(listTripsHandler)
});
//# sourceMappingURL=index.js.map