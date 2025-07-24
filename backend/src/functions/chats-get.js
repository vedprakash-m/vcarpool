"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsGet = chatsGet;
const functions_1 = require("@azure/functions");
const database_1 = require("../config/database");
const messaging_service_1 = require("../services/messaging.service");
const message_repository_1 = require("../repositories/message.repository");
const user_repository_1 = require("../repositories/user.repository");
const trip_repository_1 = require("../repositories/trip.repository");
const validation_handler_1 = require("../utils/validation-handler");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../middleware");
async function chatsGet(request, context) {
    const logger = context; // Use context for logging if needed
    // Use dependency injection for MessagingService if available
    // Otherwise, instantiate as before
    const userId = request.auth?.userId;
    if (!userId) {
        return {
            status: 401,
            jsonBody: { success: false, error: "User not authenticated." },
        };
    }
    // Validate query parameters
    const query = (0, validation_handler_1.handleValidation)(shared_1.chatsQuerySchema, {
        tripId: request.query.get("tripId"),
        includeInactive: request.query.get("includeInactive") === "true",
        page: parseInt(request.query.get("page") || "1"),
        limit: parseInt(request.query.get("limit") || "10"),
    });
    // Initialize repositories and service
    const messageRepository = new message_repository_1.MessageRepository(database_1.containers.messages);
    const chatRepository = new message_repository_1.ChatRepository(database_1.containers.chats);
    const participantRepository = new message_repository_1.ChatParticipantRepository(database_1.containers.chatParticipants);
    const userRepository = new user_repository_1.UserRepository(database_1.containers.users);
    const tripRepository = new trip_repository_1.TripRepository(database_1.containers.trips);
    const messagingService = new messaging_service_1.MessagingService(messageRepository, chatRepository, participantRepository, userRepository, tripRepository);
    // Ensure page and limit have default values
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    // Get user's chats
    const { chats, total } = await messagingService.getUserChats(userId, {
        includeInactive: query.includeInactive,
        limit: query.limit ?? 10,
        offset: ((query.page ?? 1) - 1) * (query.limit ?? 10),
    });
    return {
        status: 200,
        jsonBody: {
            success: true,
            data: chats,
            pagination: {
                page: page,
                limit: limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
}
functions_1.app.http("chats-get", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "chats",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate)(chatsGet),
});
