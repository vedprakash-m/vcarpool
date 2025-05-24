"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const auth_service_1 = require("../../services/auth.service");
const user_service_1 = require("../../services/user.service");
const middleware_1 = require("../../middleware");
async function registerHandler(request, context) {
    const { email, password, firstName, lastName, phoneNumber, department } = request.validatedBody;
    // Check if user already exists
    const existingUser = await user_service_1.UserService.getUserByEmail(email);
    if (existingUser) {
        return {
            status: 409,
            jsonBody: {
                success: false,
                error: 'User with this email already exists'
            }
        };
    }
    // Hash password
    const passwordHash = await auth_service_1.AuthService.hashPassword(password);
    // Create user
    const user = await user_service_1.UserService.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        department
    });
    // Generate tokens
    const accessToken = auth_service_1.AuthService.generateAccessToken(user);
    const refreshToken = auth_service_1.AuthService.generateRefreshToken(user);
    return {
        status: 201,
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
exports.default = (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, (0, middleware_1.validateBody)(shared_1.registerSchema))(registerHandler);
functions_1.app.http('auth-register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/register',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, (0, middleware_1.validateBody)(shared_1.registerSchema))(registerHandler)
});
//# sourceMappingURL=index.js.map