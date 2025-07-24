"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("reflect-metadata");
const container_1 = require("../../container");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../../middleware");
const error_handler_1 = require("../../utils/error-handler");
async function usersUpdateHandler(request, context) {
    const logger = container_1.container.resolve("ILogger");
    const userService = container_1.container.resolve("UserService");
    try {
        const userId = request.auth?.userId;
        if (!userId) {
            throw new Error("User not authenticated.");
        }
        const updates = request.validated.body;
        const updatedUser = await userService.updateUser(userId, updates);
        logger.info("User updated profile successfully", { userId });
        return {
            jsonBody: {
                success: true,
                message: "Profile updated successfully.",
                data: updatedUser,
            },
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("users-update", {
    methods: ["PATCH"],
    authLevel: "anonymous", // Handled by middleware
    route: "users/me",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.updateUserSchema))(usersUpdateHandler),
});
