"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const auth_service_1 = require("../../services/auth.service");
const user_service_1 = require("../../services/user.service");
const middleware_1 = require("../../middleware");
async function loginHandler(request, context) {
    const { email, password } = request.validatedBody;
    // Find user by email
    const userWithPassword = await user_service_1.UserService.getUserByEmail(email);
    if (!userWithPassword) {
        return {
            status: 401,
            jsonBody: {
                success: false,
                error: 'Invalid email or password'
            }
        };
    }
    // Verify password
    const isPasswordValid = await auth_service_1.AuthService.verifyPassword(password, userWithPassword.passwordHash);
    if (!isPasswordValid) {
        return {
            status: 401,
            jsonBody: {
                success: false,
                error: 'Invalid email or password'
            }
        };
    }
    // Remove password hash from user object
    const { passwordHash, ...user } = userWithPassword;
    // Generate tokens
    const accessToken = auth_service_1.AuthService.generateAccessToken(user);
    const refreshToken = auth_service_1.AuthService.generateRefreshToken(user);
    return {
        status: 200,
        jsonBody: {
            success: true,
            data: {
                user,
                token: accessToken,
                refreshToken
            }
        }
    };
}
functions_1.app.http('auth-login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, (0, middleware_1.validateBody)(shared_1.loginSchema))(loginHandler)
});
//# sourceMappingURL=index.js.map