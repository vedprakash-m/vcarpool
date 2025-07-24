import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { containers } from '../config/database';
import { MessagingService } from '../services/messaging.service';
import {
  MessageRepository,
  ChatRepository,
  ChatParticipantRepository,
} from '../repositories/message.repository';
import { UserRepository } from '../repositories/user.repository';
import { TripRepository } from '../repositories/trip.repository';
import { handleRequest } from '../utils/request-handler';
import { handleValidation } from '../utils/validation-handler';
import { sendMessageSchema, SendMessageRequest } from '@carpool/shared';
import { compose, authenticate, requestId, requestLogging, validateBody } from '../middleware';

export async function messagesSend(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = context; // Use context for logging if needed
  // Use dependency injection for MessagingService if available
  // Otherwise, instantiate as before
  const userId = request.auth?.userId;
  if (!userId) {
    return {
      status: 401,
      jsonBody: { success: false, error: 'User not authenticated.' },
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
          error: 'Chat ID is required',
        },
      };
    }

    // Initialize repositories and service
    const messageRepository = new MessageRepository(containers.messages);
    const chatRepository = new ChatRepository(containers.chats);
    const participantRepository = new ChatParticipantRepository(containers.chatParticipants);
    const userRepository = new UserRepository(containers.users);
    const tripRepository = new TripRepository(containers.trips);

    const messagingService = new MessagingService(
      messageRepository,
      chatRepository,
      participantRepository,
      userRepository,
      tripRepository,
    );

    // Send message
    const message = await messagingService.sendMessage(chatId, userId, messageData);

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: message,
        message: 'Message sent successfully',
      },
    };
  } catch (error: any) {
    context.error('Error sending message:', error);
    return {
      status: error.statusCode || 500,
      jsonBody: {
        success: false,
        error: error.message || 'Failed to send message',
      },
    };
  }
}

app.http('messages-send', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chats/{chatId}/messages',
  handler: compose(
    requestId,
    requestLogging,
    authenticate,
    validateBody(sendMessageSchema),
  )(messagesSend),
});
