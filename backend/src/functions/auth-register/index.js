"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("reflect-metadata");
const container_1 = require("../../container");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../../middleware");
const error_handler_1 = require("../../utils/error-handler");
async function registerHandler(request, context) {
    const logger = container_1.container.resolve("ILogger");
    const authService = container_1.container.resolve("AuthService");
    const familyService = container_1.container.resolve("FamilyService");
    const childService = container_1.container.resolve("ChildService");
    try {
        const { user: userData, family: familyData } = request.validated.body;
        // 1. Create the user
        const user = await authService.register(userData);
        // 2. Create the family and children, linking them to the user
        const family = await familyService.createFamilyForUser(familyData, user.id);
        // This is a simplified approach. A more robust solution would involve a transaction.
        const children = [];
        for (const childData of familyData.children) {
            const child = await childService.createChild(childData, family.id, user.id);
            children.push(child);
        }
        logger.info("User and family registered successfully", {
            userId: user.id,
            familyId: family.id,
        });
        return {
            status: 201,
            jsonBody: {
                success: true,
                message: "Registration successful",
                data: {
                    user,
                    family: {
                        ...family,
                        children,
                    },
                },
            },
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("auth-register", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "auth/register",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, (0, middleware_1.validateBody)(shared_1.registerSchema))(registerHandler),
});
