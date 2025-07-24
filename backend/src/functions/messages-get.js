"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesGet = messagesGet;
const functions_1 = require("@azure/functions");
const database_1 = require("../config/database");
const messaging_service_1 = require("../services/messaging.service");
const message_repository_1 = require("../repositories/message.repository");
const user_repository_1 = require("../repositories/user.repository");
const trip_repository_1 = require("../repositories/trip.repository");
const validation_handler_1 = require("../utils/validation-handler");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../middleware");
async function messagesGet(request, context) {
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
    const query = (0, validation_handler_1.handleValidation)(shared_1.messagesQuerySchema, {
        chatId: request.query.get("chatId"),
        before: request.query.get("before"),
        after: request.query.get("after"),
        page: parseInt(request.query.get("page") || "1"),
        limit: parseInt(request.query.get("limit") || "50"),
    });
    // Initialize repositories and service
    const messageRepository = new message_repository_1.MessageRepository(database_1.containers.messages);
    const chatRepository = new message_repository_1.ChatRepository(database_1.containers.chats);
    const participantRepository = new message_repository_1.ChatParticipantRepository(database_1.containers.chatParticipants);
    const userRepository = new user_repository_1.UserRepository(database_1.containers.users);
    const tripRepository = new trip_repository_1.TripRepository(database_1.containers.trips);
    const messagingService = new messaging_service_1.MessagingService(messageRepository, chatRepository, participantRepository, userRepository, tripRepository);
    // Get messages
    const { messages, total } = await messagingService.getMessages(query.chatId, userId, {
        limit: query.limit ?? 50,
        offset: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        before: query.before ? new Date(query.before) : undefined,
        after: query.after ? new Date(query.after) : undefined,
    });
    return {
        status: 200,
        jsonBody: {
            success: true,
            data: messages,
            pagination: {
                page: query.page ?? 1,
                limit: query.limit ?? 50,
                total,
                totalPages: Math.ceil(total / (query.limit ?? 50)),
            },
        },
    };
}
functions_1.app.http("messages-get", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "chats/{chatId}/messages",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate)(messagesGet),
});
