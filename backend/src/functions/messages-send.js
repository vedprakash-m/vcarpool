"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesSend = messagesSend;
const functions_1 = require("@azure/functions");
const database_1 = require("../config/database");
const messaging_service_1 = require("../services/messaging.service");
const message_repository_1 = require("../repositories/message.repository");
const user_repository_1 = require("../repositories/user.repository");
const trip_repository_1 = require("../repositories/trip.repository");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../middleware");
async function messagesSend(request, context) {
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
    // Use validated body from middleware
    const messageData = request.validated?.body;
    try {
        // Get chatId from route parameters
        const chatId = request.params.chatId;
        if (!chatId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: "Chat ID is required",
                },
            };
        }
        // Initialize repositories and service
        const messageRepository = new message_repository_1.MessageRepository(database_1.containers.messages);
        const chatRepository = new message_repository_1.ChatRepository(database_1.containers.chats);
        const participantRepository = new message_repository_1.ChatParticipantRepository(database_1.containers.chatParticipants);
        const userRepository = new user_repository_1.UserRepository(database_1.containers.users);
        const tripRepository = new trip_repository_1.TripRepository(database_1.containers.trips);
        const messagingService = new messaging_service_1.MessagingService(messageRepository, chatRepository, participantRepository, userRepository, tripRepository);
        // Send message
        const message = await messagingService.sendMessage(chatId, userId, messageData);
        return {
            status: 201,
            jsonBody: {
                success: true,
                data: message,
                message: "Message sent successfully",
            },
        };
    }
    catch (error) {
        context.error("Error sending message:", error);
        return {
            status: error.statusCode || 500,
            jsonBody: {
                success: false,
                error: error.message || "Failed to send message",
            },
        };
    }
}
functions_1.app.http("messages-send", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "chats/{chatId}/messages",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.sendMessageSchema))(messagesSend),
});
