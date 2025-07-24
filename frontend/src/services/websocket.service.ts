/**
 * WebSocket Service for Real-time Communication
 * Handles live messaging, notifications, and real-time updates
 */

import { useEffect, useRef, useState } from 'react';

export interface WebSocketMessage {
  type:
    | 'message'
    | 'notification'
    | 'location_update'
    | 'trip_status'
    | 'heartbeat'
    | 'typing'
    | 'user_joined'
    | 'user_left';
  data: any;
  timestamp: string;
  userId?: string;
  chatId?: string;
  tripId?: string;
}

export interface RealTimeMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'voice' | 'location' | 'photo' | 'system';
  createdAt: Date;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    imageUrl?: string;
  };
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.notifyConnectionListeners(true);
          resolve();
        };

        this.ws.onmessage = event => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = event => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.notifyConnectionListeners(false);

          if (
            !event.wasClean &&
            this.reconnectAttempts < this.config.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = error => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.notifyConnectionListeners(false);
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
    }
  }

  // Message type handlers
  onMessage(handler: (data: RealTimeMessage) => void): void {
    this.messageHandlers.set('message', handler);
  }

  onNotification(handler: (data: any) => void): void {
    this.messageHandlers.set('notification', handler);
  }

  onLocationUpdate(handler: (data: any) => void): void {
    this.messageHandlers.set('location_update', handler);
  }

  onTripStatus(handler: (data: any) => void): void {
    this.messageHandlers.set('trip_status', handler);
  }

  onTyping(
    handler: (data: {
      userId: string;
      isTyping: boolean;
      chatId: string;
    }) => void
  ): void {
    this.messageHandlers.set('typing', handler);
  }

  onUserJoined(
    handler: (data: {
      userId: string;
      userName: string;
      chatId: string;
    }) => void
  ): void {
    this.messageHandlers.set('user_joined', handler);
  }

  onUserLeft(
    handler: (data: {
      userId: string;
      userName: string;
      chatId: string;
    }) => void
  ): void {
    this.messageHandlers.set('user_left', handler);
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      data: { chatId, isTyping },
      timestamp: new Date().toISOString(),
      chatId,
    });
  }

  // Join chat room
  joinChat(chatId: string): void {
    this.sendMessage({
      type: 'user_joined',
      data: { chatId },
      timestamp: new Date().toISOString(),
      chatId,
    });
  }

  // Leave chat room
  leaveChat(chatId: string): void {
    this.sendMessage({
      type: 'user_left',
      data: { chatId },
      timestamp: new Date().toISOString(),
      chatId,
    });
  }

  onConnectionChange(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
  }

  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      if (message.type === 'heartbeat') {
        this.sendMessage({
          type: 'heartbeat',
          data: { pong: true },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({
          type: 'heartbeat',
          data: { ping: true },
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// React Hook for WebSocket
export function useWebSocket(chatId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<RealTimeMessage[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocketService | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const config: WebSocketConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
    };

    wsRef.current = new WebSocketService(config);

    // Set up message handlers
    wsRef.current.onMessage((data: RealTimeMessage) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(msg => msg.id === data.id)) return prev;
        return [...prev, data].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    });

    wsRef.current.onNotification(data => {
      setNotifications(prev => [...prev, data]);
    });

    wsRef.current.onTyping(data => {
      if (!chatId || data.chatId !== chatId) return;

      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    wsRef.current.onUserJoined(data => {
      if (!chatId || data.chatId !== chatId) return;
      setOnlineUsers(prev => new Set(Array.from(prev).concat(data.userId)));
    });

    wsRef.current.onUserLeft(data => {
      if (!chatId || data.chatId !== chatId) return;
      setOnlineUsers(prev => {
        const newArray = Array.from(prev).filter(id => id !== data.userId);
        return new Set(newArray);
      });
    });

    wsRef.current.onConnectionChange(setIsConnected);

    // Connect
    wsRef.current.connect().catch(console.error);

    // Join chat if provided
    if (chatId) {
      wsRef.current.connect().then(() => {
        wsRef.current?.joinChat(chatId);
      });
    }

    return () => {
      if (chatId && wsRef.current) {
        wsRef.current.leaveChat(chatId);
      }
      wsRef.current?.disconnect();
    };
  }, [chatId]);

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    wsRef.current?.sendMessage({
      ...message,
      timestamp: new Date().toISOString(),
    });
  };

  const sendTyping = (isTyping: boolean) => {
    if (!chatId) return;

    wsRef.current?.sendTyping(chatId, isTyping);

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        wsRef.current?.sendTyping(chatId, false);
      }, 3000);
    }
  };

  const clearMessages = () => setMessages([]);
  const clearNotifications = () => setNotifications([]);

  return {
    isConnected,
    messages,
    notifications,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
    clearMessages,
    clearNotifications,
    service: wsRef.current,
  };
}

export default WebSocketService;
