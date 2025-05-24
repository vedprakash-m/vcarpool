"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const middleware_1 = require("../../middleware");
const container_1 = require("../../container");
async function refreshTokenHandler(request, context) {
    try {
        // Parse request body
        const body = await request.json();
        const { refreshToken } = body;
        if (!refreshToken) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Refresh token is required'
                }
            };
        }
        const authService = container_1.container.authService;
        // Verify and refresh the token
        const { accessToken, user } = await authService.refreshAccessToken(refreshToken);
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: {
                    user,
                    token: accessToken,
                    refreshToken // Return the same refresh token
                },
                message: 'Token refreshed successfully'
            }
        };
    }
    catch (error) {
        context.error('Error refreshing token:', error);
        return {
            status: 401,
            jsonBody: {
                success: false,
                error: 'Invalid or expired refresh token'
            }
        };
    }
}
functions_1.app.http('auth-refresh-token', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/refresh-token',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler)(refreshTokenHandler)
});
//# sourceMappingURL=index.js.map