"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const monitoring_1 = require("../../utils/monitoring");
async function updateMeHandler(request, context) {
    const logger = container_1.container.loggers.user;
    // Set context for the logger
    if ('setContext' in logger) {
        logger.setContext(context);
    }
    const userId = request.user.userId;
    const updates = request.validatedBody;
    // Log the operation start
    logger.info('Updating user profile', { userId, updateFields: Object.keys(updates) });
    try {
        // Update user profile with performance tracking
        const updatedUser = await (0, monitoring_1.trackExecutionTime)('updateUser', () => container_1.container.userService.updateUser(userId, updates), 'UserService');
        if (!updatedUser) {
            logger.warn('User not found during profile update', { userId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'User not found'
                }
            };
        }
        logger.info('User profile updated successfully', { userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: updatedUser,
                message: 'Profile updated successfully'
            }
        };
    }
    catch (error) {
        logger.error('Error updating user profile', { userId, error });
        throw error; // Let the error handler middleware handle it
    }
}
functions_1.app.http('users-update', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'users/me',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.updateUserSchema))(updateMeHandler)
});
//# sourceMappingURL=index.js.map