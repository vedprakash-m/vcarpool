"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("reflect-metadata");
const container_1 = require("../../container");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../../middleware");
const error_handler_1 = require("../../utils/error-handler");
async function loginHandler(request, context) {
    const logger = container_1.container.resolve("ILogger");
    const authService = container_1.container.resolve("AuthService");
    try {
        const { email, password } = request.validated.body;
        const { user, accessToken, refreshToken } = await authService.login(email, password);
        logger.info(`User logged in successfully`, { userId: user.id });
        return {
            jsonBody: {
                success: true,
                message: "Login successful",
                data: { user, accessToken, refreshToken },
            },
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("auth-login", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "auth/login",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, (0, middleware_1.validateBody)(shared_1.loginSchema))(loginHandler),
});
