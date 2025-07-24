"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("reflect-metadata");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const error_handler_1 = require("../../utils/error-handler");
async function usersMeHandler(request, context) {
    const logger = container_1.container.resolve("ILogger");
    const userService = container_1.container.resolve("UserService");
    try {
        const userId = request.auth?.userId;
        if (!userId) {
            // This should technically be caught by the authenticate middleware,
            // but it's good practice to check.
            throw new Error("User not authenticated.");
        }
        const user = await userService.getUserById(userId);
        if (!user) {
            throw new Error("Authenticated user not found.");
        }
        logger.info("Fetched current user profile successfully", { userId });
        return {
            jsonBody: {
                success: true,
                message: "User profile fetched successfully.",
                data: user,
            },
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("users-me", {
    methods: ["GET"],
    authLevel: "anonymous", // Handled by middleware
    route: "users/me",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate)(usersMeHandler),
});
