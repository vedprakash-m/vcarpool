"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatParticipantRepository = exports.ChatRepository = exports.MessageRepository = void 0;
const uuid_1 = require("uuid");
class MessageRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    /**
     * Create a new message
     */
    async createMessage(message) {
        const newMessage = {
            ...message,
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const { resource } = await this.container.items.create(newMessage);
        return resource;
    }
    /**
     * Get messages for a chat with pagination
     */
    async getMessages(chatId, options = {}) {
        let query = "SELECT * FROM c WHERE c.chatId = @chatId AND (c.deletedAt IS NULL OR c.deletedAt = null)";
        const parameters = [{ name: "@chatId", value: chatId }];
        if (options.before) {
            query += " AND c.createdAt < @before";
            parameters.push({ name: "@before", value: options.before.toISOString() });
        }
        if (options.after) {
            query += " AND c.createdAt > @after";
            parameters.push({ name: "@after", value: options.after.toISOString() });
        }
        query += " ORDER BY c.createdAt DESC";
        if (options.limit) {
            query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
        }
        const { resources: messages } = await this.container.items
            .query({
            query,
            parameters,
        })
            .fetchAll();
        // Get total count
        const countQuery = query
            .replace("SELECT * FROM c", "SELECT VALUE COUNT(1) FROM c")
            .replace(/ORDER BY .+$/, "")
            .replace(/OFFSET .+ LIMIT .+$/, "");
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
    async getMessageById(messageId) {
        try {
            const { resource } = await this.container
                .item(messageId, messageId)
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Update a message
     */
    async updateMessage(messageId, updates) {
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
            const { resource } = await this.container
                .item(messageId, messageId)
                .replace(updatedMessage);
            return resource;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Soft delete a message
     */
    async deleteMessage(messageId) {
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
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get unread message count for a user in a chat
     */
    async getUnreadCount(chatId, userId, lastReadAt) {
        let query = "SELECT VALUE COUNT(1) FROM c WHERE c.chatId = @chatId AND c.senderId != @userId";
        const parameters = [
            { name: "@chatId", value: chatId },
            { name: "@userId", value: userId },
        ];
        if (lastReadAt) {
            query += " AND c.createdAt > @lastReadAt";
            parameters.push({ name: "@lastReadAt", value: lastReadAt.toISOString() });
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
    async getLatestMessage(chatId) {
        const query = {
            query: "SELECT TOP 1 * FROM c WHERE c.chatId = @chatId AND (c.deletedAt IS NULL OR c.deletedAt = null) ORDER BY c.createdAt DESC",
            parameters: [{ name: "@chatId", value: chatId }],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources[0] || null;
    }
}
exports.MessageRepository = MessageRepository;
class ChatRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    /**
     * Create a new chat room
     */
    async createChat(chat) {
        const newChat = {
            ...chat,
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const { resource } = await this.container.items.create(newChat);
        return resource;
    }
    /**
     * Get chat by ID
     */
    async getChatById(chatId) {
        try {
            const { resource } = await this.container
                .item(chatId, chatId)
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get chat by trip ID
     */
    async getChatByTripId(tripId) {
        const query = {
            query: 'SELECT * FROM c WHERE c.tripId = @tripId AND c.type = "trip_chat"',
            parameters: [{ name: "@tripId", value: tripId }],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources[0] || null;
    }
    /**
     * Get chats for a user
     */
    async getUserChats(userId, options = {}) {
        let query = "SELECT * FROM c WHERE ARRAY_CONTAINS(c.participants, @userId)";
        const parameters = [{ name: "@userId", value: userId }];
        if (!options.includeInactive) {
            query += " AND c.isActive = true";
        }
        query += " ORDER BY c.updatedAt DESC";
        if (options.limit) {
            query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
        }
        const { resources: chats } = await this.container.items
            .query({
            query,
            parameters,
        })
            .fetchAll();
        // Get total count
        const countQuery = query
            .replace("SELECT * FROM c", "SELECT VALUE COUNT(1) FROM c")
            .replace(/ORDER BY .+$/, "")
            .replace(/OFFSET .+ LIMIT .+$/, "");
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
    async updateChat(chatId, updates) {
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
            const { resource } = await this.container
                .item(chatId, chatId)
                .replace(updatedChat);
            return resource;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Add participant to chat
     */
    async addParticipant(chatId, userId) {
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
    async removeParticipant(chatId, userId) {
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
exports.ChatRepository = ChatRepository;
class ChatParticipantRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    /**
     * Create chat participant
     */
    async createParticipant(participant) {
        const { resource } = await this.container.items.create(participant);
        return resource;
    }
    /**
     * Get participant by user and chat
     */
    async getParticipant(userId, chatId) {
        const query = {
            query: "SELECT * FROM c WHERE c.userId = @userId AND c.chatId = @chatId",
            parameters: [
                { name: "@userId", value: userId },
                { name: "@chatId", value: chatId },
            ],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources[0] || null;
    }
    /**
     * Update participant's last read timestamp
     */
    async updateLastRead(userId, chatId, lastReadAt) {
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
    async getChatParticipants(chatId) {
        const query = {
            query: "SELECT * FROM c WHERE c.chatId = @chatId",
            parameters: [{ name: "@chatId", value: chatId }],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources;
    }
}
exports.ChatParticipantRepository = ChatParticipantRepository;
