import { Container } from '@azure/cosmos';
import { Message, ChatRoom, ChatParticipant } from '@carpool/shared';
import { v4 as uuidv4 } from 'uuid';

export class MessageRepository {
  constructor(private container: Container) {}

  /**
   * Create a new message
   */
  async createMessage(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { resource } = await this.container.items.create(newMessage);
    return resource as Message;
  }

  /**
   * Get messages for a chat with pagination
   */
  async getMessages(
    chatId: string,
    options: {
      limit?: number;
      before?: Date;
      after?: Date;
      offset?: number;
    } = {},
  ): Promise<{ messages: Message[]; total: number }> {
    let query =
      'SELECT * FROM c WHERE c.chatId = @chatId AND (c.deletedAt IS NULL OR c.deletedAt = null)';
    const parameters = [{ name: '@chatId', value: chatId }];

    if (options.before) {
      query += ' AND c.createdAt < @before';
      parameters.push({ name: '@before', value: options.before.toISOString() });
    }

    if (options.after) {
      query += ' AND c.createdAt > @after';
      parameters.push({ name: '@after', value: options.after.toISOString() });
    }

    query += ' ORDER BY c.createdAt DESC';

    if (options.limit) {
      query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
    }

    const { resources: messages } = await this.container.items
      .query<Message>({
        query,
        parameters,
      })
      .fetchAll();

    // Get total count
    const countQuery = query
      .replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c')
      .replace(/ORDER BY .+$/, '')
      .replace(/OFFSET .+ LIMIT .+$/, '');

    const { resources: countResult } = await this.container.items
      .query({
        query: countQuery,
        parameters,
      })
      .fetchAll();

    const total = countResult[0] || 0;

    return { messages, total };
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    try {
      const { resource } = await this.container.item(messageId, messageId).read<Message>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message | null> {
    try {
      const existingMessage = await this.getMessageById(messageId);
      if (!existingMessage) {
        return null;
      }

      const updatedMessage = {
        ...existingMessage,
        ...updates,
        updatedAt: new Date(),
        editedAt: updates.content ? new Date() : existingMessage.editedAt,
      };

      const { resource } = await this.container.item(messageId, messageId).replace(updatedMessage);
      return resource as Message;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const existingMessage = await this.getMessageById(messageId);
      if (!existingMessage) {
        return false;
      }

      const deletedMessage = {
        ...existingMessage,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };

      await this.container.item(messageId, messageId).replace(deletedMessage);
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a chat
   */
  async getUnreadCount(chatId: string, userId: string, lastReadAt?: Date): Promise<number> {
    let query = 'SELECT VALUE COUNT(1) FROM c WHERE c.chatId = @chatId AND c.senderId != @userId';
    const parameters = [
      { name: '@chatId', value: chatId },
      { name: '@userId', value: userId },
    ];

    if (lastReadAt) {
      query += ' AND c.createdAt > @lastReadAt';
      parameters.push({ name: '@lastReadAt', value: lastReadAt.toISOString() });
    }

    const { resources } = await this.container.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    return resources[0] || 0;
  }

  /**
   * Get latest message for a chat
   */
  async getLatestMessage(chatId: string): Promise<Message | null> {
    const query = {
      query:
        'SELECT TOP 1 * FROM c WHERE c.chatId = @chatId AND (c.deletedAt IS NULL OR c.deletedAt = null) ORDER BY c.createdAt DESC',
      parameters: [{ name: '@chatId', value: chatId }],
    };

    const { resources } = await this.container.items.query<Message>(query).fetchAll();
    return resources[0] || null;
  }
}

export class ChatRepository {
  constructor(private container: Container) {}

  /**
   * Create a new chat room
   */
  async createChat(chat: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatRoom> {
    const newChat: ChatRoom = {
      ...chat,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { resource } = await this.container.items.create(newChat);
    return resource as ChatRoom;
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string): Promise<ChatRoom | null> {
    try {
      const { resource } = await this.container.item(chatId, chatId).read<ChatRoom>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get chat by trip ID
   */
  async getChatByTripId(tripId: string): Promise<ChatRoom | null> {
    const query = {
      query: 'SELECT * FROM c WHERE c.tripId = @tripId AND c.type = "trip_chat"',
      parameters: [{ name: '@tripId', value: tripId }],
    };

    const { resources } = await this.container.items.query<ChatRoom>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Get chats for a user
   */
  async getUserChats(
    userId: string,
    options: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ chats: ChatRoom[]; total: number }> {
    let query = 'SELECT * FROM c WHERE ARRAY_CONTAINS(c.participants, @userId)';
    const parameters = [{ name: '@userId', value: userId }];

    if (!options.includeInactive) {
      query += ' AND c.isActive = true';
    }

    query += ' ORDER BY c.updatedAt DESC';

    if (options.limit) {
      query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
    }

    const { resources: chats } = await this.container.items
      .query<ChatRoom>({
        query,
        parameters,
      })
      .fetchAll();

    // Get total count
    const countQuery = query
      .replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c')
      .replace(/ORDER BY .+$/, '')
      .replace(/OFFSET .+ LIMIT .+$/, '');

    const { resources: countResult } = await this.container.items
      .query({
        query: countQuery,
        parameters,
      })
      .fetchAll();

    const total = countResult[0] || 0;

    return { chats, total };
  }

  /**
   * Update chat
   */
  async updateChat(chatId: string, updates: Partial<ChatRoom>): Promise<ChatRoom | null> {
    try {
      const existingChat = await this.getChatById(chatId);
      if (!existingChat) {
        return null;
      }

      const updatedChat = {
        ...existingChat,
        ...updates,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(chatId, chatId).replace(updatedChat);
      return resource as ChatRoom;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Add participant to chat
   */
  async addParticipant(chatId: string, userId: string): Promise<boolean> {
    const chat = await this.getChatById(chatId);
    if (!chat) {
      return false;
    }

    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
      chat.updatedAt = new Date();
      await this.container.item(chatId, chatId).replace(chat);
    }

    return true;
  }

  /**
   * Remove participant from chat
   */
  async removeParticipant(chatId: string, userId: string): Promise<boolean> {
    const chat = await this.getChatById(chatId);
    if (!chat) {
      return false;
    }

    const index = chat.participants.indexOf(userId);
    if (index > -1) {
      chat.participants.splice(index, 1);
      chat.updatedAt = new Date();
      await this.container.item(chatId, chatId).replace(chat);
    }

    return true;
  }
}

export class ChatParticipantRepository {
  constructor(private container: Container) {}

  /**
   * Create chat participant
   */
  async createParticipant(participant: ChatParticipant): Promise<ChatParticipant> {
    const { resource } = await this.container.items.create(participant);
    return resource as ChatParticipant;
  }

  /**
   * Get participant by user and chat
   */
  async getParticipant(userId: string, chatId: string): Promise<ChatParticipant | null> {
    const query = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.chatId = @chatId',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@chatId', value: chatId },
      ],
    };

    const { resources } = await this.container.items.query<ChatParticipant>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Update participant's last read timestamp
   */
  async updateLastRead(userId: string, chatId: string, lastReadAt: Date): Promise<boolean> {
    const participant = await this.getParticipant(userId, chatId);
    if (!participant) {
      return false;
    }

    const updatedParticipant = {
      ...participant,
      lastReadAt,
    };

    await this.container.items.upsert(updatedParticipant);
    return true;
  }

  /**
   * Get chat participants
   */
  async getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.chatId = @chatId',
      parameters: [{ name: '@chatId', value: chatId }],
    };

    const { resources } = await this.container.items.query<ChatParticipant>(query).fetchAll();
    return resources;
  }
}
