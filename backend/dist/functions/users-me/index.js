"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const monitoring_1 = require("../../utils/monitoring");
async function getMeHandler(request, context) {
    const logger = container_1.container.loggers.user;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    // Log the operation start
    logger.info('Retrieving user profile', { userId: request.user?.userId });
    const userId = request.user.userId;
    try {
        // Get user profile with performance tracking
        const user = await (0, monitoring_1.trackExecutionTime)('getUserById', () => container_1.container.userService.getUserById(userId), 'UserService');
        if (!user) {
            logger.warn('User profile not found', { userId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'User not found'
                }
            };
        }
        logger.info('User profile retrieved successfully', { userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: user
            }
        };
    }
    catch (error) {
        logger.error('Error retrieving user profile', { userId, error });
        throw error; // Let the error handler middleware handle it
    }
}
functions_1.app.http('users-me', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users/me',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate)(getMeHandler)
});
//# sourceMappingURL=index.js.map