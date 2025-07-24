"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsCreate = chatsCreate;
const functions_1 = require("@azure/functions");
const database_1 = require("../config/database");
const messaging_service_1 = require("../services/messaging.service");
const message_repository_1 = require("../repositories/message.repository");
const user_repository_1 = require("../repositories/user.repository");
const trip_repository_1 = require("../repositories/trip.repository");
const shared_1 = require("@carpool/shared");
const middleware_1 = require("../middleware");
async function chatsCreate(request, context) {
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
    const chatData = request.validated?.body;
    try {
        // Initialize repositories and service
        const messageRepository = new message_repository_1.MessageRepository(database_1.containers.messages);
        const chatRepository = new message_repository_1.ChatRepository(database_1.containers.chats);
        const participantRepository = new message_repository_1.ChatParticipantRepository(database_1.containers.chatParticipants);
        const userRepository = new user_repository_1.UserRepository(database_1.containers.users);
        const tripRepository = new trip_repository_1.TripRepository(database_1.containers.trips);
        const messagingService = new messaging_service_1.MessagingService(messageRepository, chatRepository, participantRepository, userRepository, tripRepository);
        // Get or create trip chat
        const chat = await messagingService.getOrCreateTripChat(chatData.tripId, userId);
        return {
            status: 201,
            jsonBody: {
                success: true,
                data: chat,
                message: "Chat created successfully",
            },
        };
    }
    catch (error) {
        context.error("Error creating chat:", error);
        return {
            status: error.statusCode || 500,
            jsonBody: {
                success: false,
                error: error.message || "Failed to create chat",
            },
        };
    }
}
functions_1.app.http("chats-create", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "chats",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.createChatSchema))(chatsCreate),
});
