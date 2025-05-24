"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const monitoring_1 = require("../../utils/monitoring");
async function getTripStatsHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    const userId = request.user.userId;
    // Get query parameters (if any)
    const timeRange = request.query?.get('timeRange') || 'all';
    // Log the operation start
    logger.info('Retrieving trip statistics', { userId, timeRange });
    try {
        // Get basic trip stats with performance tracking
        const stats = await (0, monitoring_1.trackExecutionTime)('getTripStats', () => container_1.container.tripService.getTripStats(userId), 'TripService');
        // Get upcoming trips count with performance tracking
        const upcomingTrips = await (0, monitoring_1.trackExecutionTime)('getUserUpcomingTrips', () => container_1.container.tripService.getUserUpcomingTrips(userId), 'TripService');
        const tripStats = {
            ...stats,
            upcomingTrips: upcomingTrips.length
        };
        logger.info('Trip statistics retrieved successfully', { userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: tripStats
            }
        };
    }
    catch (error) {
        logger.error('Error retrieving trip statistics', { userId, error });
        throw error; // Let the error handler middleware handle it
    }
}
functions_1.app.http('trips-stats', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'trips/stats',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate)(getTripStatsHandler)
});
//# sourceMappingURL=index.js.map