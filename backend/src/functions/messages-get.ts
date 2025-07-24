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
import { messagesQuerySchema } from '@carpool/shared';
import { compose, authenticate, requestId, requestLogging } from '../middleware';

export async function messagesGet(
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
  // Validate query parameters
  const query = handleValidation(messagesQuerySchema, {
    chatId: request.query.get('chatId'),
    before: request.query.get('before'),
    after: request.query.get('after'),
    page: parseInt(request.query.get('page') || '1'),
    limit: parseInt(request.query.get('limit') || '50'),
  });

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

app.http('messages-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'chats/{chatId}/messages',
  handler: compose(requestId, requestLogging, authenticate)(messagesGet),
});
