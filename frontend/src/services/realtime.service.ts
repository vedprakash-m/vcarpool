/**
 * Real-time Service - WebSocket and Server-Sent Events for live updates
 * Handles real-time notifications, status updates, and live data synchronization
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface RealTimeMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  groupId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected: Date | null;
  errorCount: number;
  latency: number;
}

export interface RealTimeCapabilities {
  webSocketSupported: boolean;
  serverSentEventsSupported: boolean;
  notificationsSupported: boolean;
  pushSupported: boolean;
}

export type RealTimeMessageHandler = (message: RealTimeMessage) => void;

class RealTimeService {
  private static instance: RealTimeService;
  private webSocket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private messageHandlers: Map<string, Set<RealTimeMessageHandler>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private latencyStart = 0;

  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    lastConnected: null,
    errorCount: 0,
    latency: 0,
  };

  private constructor() {
    this.setupVisibilityHandling();
  }

  static getInstance(): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService();
    }
    return RealTimeService.instance;
  }

  /**
   * Get real-time capabilities
   */
  getCapabilities(): RealTimeCapabilities {
    if (typeof window === 'undefined') {
      return {
        webSocketSupported: false,
        serverSentEventsSupported: false,
        notificationsSupported: false,
        pushSupported: false,
      };
    }

    return {
      webSocketSupported: 'WebSocket' in window,
      serverSentEventsSupported: 'EventSource' in window,
      notificationsSupported: 'Notification' in window,
      pushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    };
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  async connectWebSocket(url: string, token?: string): Promise<void> {
    if (!this.getCapabilities().webSocketSupported) {
      throw new Error('WebSocket not supported');
    }

    // Close existing connection
    this.disconnect();

    try {
      const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateConnectionStatus({
          connected: true,
          reconnecting: false,
          lastConnected: new Date(),
          errorCount: 0,
        });
        this.startPingPong();
      };

      this.webSocket.onmessage = event => {
        try {
          const message: RealTimeMessage = JSON.parse(event.data);

          // Handle pong response for latency measurement
          if (message.type === 'pong') {
            const latency = Date.now() - this.latencyStart;
            this.updateConnectionStatus({ latency });
            return;
          }

          // Ensure message has timestamp
          if (!message.timestamp) {
            message.timestamp = new Date();
          } else if (typeof message.timestamp === 'string') {
            message.timestamp = new Date(message.timestamp);
          }

          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.webSocket.onclose = event => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.updateConnectionStatus({ connected: false });
        this.stopPingPong();

        if (
          !event.wasClean &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect(url, token);
        }
      };

      this.webSocket.onerror = error => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus({
          errorCount: this.connectionStatus.errorCount + 1,
        });
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  /**
   * Connect to Server-Sent Events
   */
  async connectSSE(url: string, token?: string): Promise<void> {
    if (!this.getCapabilities().serverSentEventsSupported) {
      throw new Error('Server-Sent Events not supported');
    }

    // Close existing connection
    this.disconnectSSE();

    try {
      const sseUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('SSE connected');
        this.updateConnectionStatus({
          connected: true,
          reconnecting: false,
          lastConnected: new Date(),
        });
      };

      this.eventSource.onmessage = event => {
        try {
          const message: RealTimeMessage = JSON.parse(event.data);

          // Ensure message has timestamp
          if (!message.timestamp) {
            message.timestamp = new Date();
          } else if (typeof message.timestamp === 'string') {
            message.timestamp = new Date(message.timestamp);
          }

          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = error => {
        console.error('SSE error:', error);
        this.updateConnectionStatus({
          connected: false,
          errorCount: this.connectionStatus.errorCount + 1,
        });

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleSSEReconnect(url, token);
        }
      };
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      throw error;
    }
  }

  /**
   * Handle incoming real-time message
   */
  private handleMessage(message: RealTimeMessage): void {
    // Global handlers (listening to all messages)
    const globalHandlers = this.messageHandlers.get('*');
    if (globalHandlers) {
      globalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in global message handler:', error);
        }
      });
    }

    // Type-specific handlers
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in ${message.type} message handler:`, error);
        }
      });
    }
  }

  /**
   * Send message via WebSocket
   */
  sendMessage(
    message: Omit<RealTimeMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const fullMessage: RealTimeMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...message,
      };

      try {
        this.webSocket.send(JSON.stringify(fullMessage));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to message type
   */
  subscribe(messageType: string, handler: RealTimeMessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Start ping-pong for latency measurement
   */
  private startPingPong(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.webSocket?.readyState === WebSocket.OPEN) {
        this.latencyStart = Date.now();
        this.sendMessage({ type: 'ping', payload: {} });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping-pong
   */
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(url: string, token?: string): void {
    this.updateConnectionStatus({ reconnecting: true });
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(
          `Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );
        this.connectWebSocket(url, token).catch(() => {
          // Reconnection failed, will be handled by onclose/onerror
        });
      } else {
        console.error('Max reconnection attempts reached');
        this.updateConnectionStatus({ reconnecting: false });
      }
    }, delay);
  }

  /**
   * Schedule SSE reconnection
   */
  private scheduleSSEReconnect(url: string, token?: string): void {
    this.updateConnectionStatus({ reconnecting: true });
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(
          `Attempting SSE reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );
        this.connectSSE(url, token).catch(() => {
          // Reconnection failed, will be handled by onerror
        });
      } else {
        console.error('Max SSE reconnection attempts reached');
        this.updateConnectionStatus({ reconnecting: false });
      }
    }, delay);
  }

  /**
   * Handle page visibility changes
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check connection
        if (
          !this.connectionStatus.connected &&
          !this.connectionStatus.reconnecting
        ) {
          // Trigger reconnection if we have connection details
          console.log('Page visible, checking connection...');
        }
      }
    });
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    this.statusListeners.forEach(listener => listener(this.connectionStatus));
  }

  /**
   * Add connection status listener
   */
  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Send current status immediately
    listener(this.connectionStatus);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Disconnect WebSocket
   */
  private disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close(1000, 'Client disconnect');
      this.webSocket = null;
    }
    this.stopPingPong();
  }

  /**
   * Disconnect SSE
   */
  private disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Disconnect all real-time connections
   */
  disconnectAll(): void {
    this.disconnect();
    this.disconnectSSE();
    this.messageHandlers.clear();
    this.updateConnectionStatus({
      connected: false,
      reconnecting: false,
    });
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.getCapabilities().notificationsSupported) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Show local notification
   */
  showNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<Notification | null> {
    return new Promise((resolve, reject) => {
      if (!this.getCapabilities().notificationsSupported) {
        reject(new Error('Notifications not supported'));
        return;
      }

      if (Notification.permission !== 'granted') {
        reject(new Error('Notification permission not granted'));
        return;
      }

      try {
        const notification = new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        resolve(notification);
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * React hook for real-time connectivity
 */
export function useRealTime(): {
  capabilities: RealTimeCapabilities;
  connectionStatus: ConnectionStatus;
  connectWebSocket: (url: string, token?: string) => Promise<void>;
  connectSSE: (url: string, token?: string) => Promise<void>;
  subscribe: (
    messageType: string,
    handler: RealTimeMessageHandler
  ) => () => void;
  sendMessage: (
    message: Omit<RealTimeMessage, 'id' | 'timestamp'>
  ) => Promise<void>;
  showNotification: (
    title: string,
    options?: NotificationOptions
  ) => Promise<Notification | null>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  disconnect: () => void;
} {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    () => RealTimeService.getInstance().getConnectionStatus()
  );

  const capabilities = RealTimeService.getInstance().getCapabilities();
  const realTimeService = RealTimeService.getInstance();

  useEffect(() => {
    const removeStatusListener =
      realTimeService.addStatusListener(setConnectionStatus);

    return () => {
      removeStatusListener();
    };
  }, [realTimeService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realTimeService.disconnectAll();
    };
  }, [realTimeService]);

  return {
    capabilities,
    connectionStatus,
    connectWebSocket: useCallback(
      realTimeService.connectWebSocket.bind(realTimeService),
      [realTimeService]
    ),
    connectSSE: useCallback(realTimeService.connectSSE.bind(realTimeService), [
      realTimeService,
    ]),
    subscribe: useCallback(realTimeService.subscribe.bind(realTimeService), [
      realTimeService,
    ]),
    sendMessage: useCallback(
      realTimeService.sendMessage.bind(realTimeService),
      [realTimeService]
    ),
    showNotification: useCallback(
      realTimeService.showNotification.bind(realTimeService),
      [realTimeService]
    ),
    requestNotificationPermission: useCallback(
      realTimeService.requestNotificationPermission.bind(realTimeService),
      [realTimeService]
    ),
    disconnect: useCallback(
      realTimeService.disconnectAll.bind(realTimeService),
      [realTimeService]
    ),
  };
}

export default RealTimeService;
