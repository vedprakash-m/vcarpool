/**
 * Offline Service - Enhanced offline capabilities and data synchronization
 * Handles offline storage, background sync, and offline-first patterns
 */

import { useEffect, useState, useCallback } from 'react';

export interface OfflineCapabilities {
  isOnline: boolean;
  isOfflineReady: boolean;
  hasUnsynced: boolean;
  lastSync: Date | null;
  storageAvailable: boolean;
  cacheSize: number;
}

export interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  synced: boolean;
  retryCount: number;
}

export interface SyncStatus {
  inProgress: boolean;
  total: number;
  completed: number;
  errors: number;
  lastError?: Error;
}

class OfflineService {
  private static instance: OfflineService;
  private db: IDBDatabase | null = null;
  private listeners: Set<(capabilities: OfflineCapabilities) => void> =
    new Set();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private capabilities: OfflineCapabilities = {
    isOnline: true,
    isOfflineReady: false,
    hasUnsynced: false,
    lastSync: null,
    storageAvailable: false,
    cacheSize: 0,
  };

  private constructor() {
    this.initializeDB();
    this.setupOnlineDetection();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const request = indexedDB.open('CarpoolOfflineDB', 1);

      request.onerror = () => {
        console.error('Failed to open offline database');
        this.updateCapabilities({ storageAvailable: false });
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.updateCapabilities({
          storageAvailable: true,
          isOfflineReady: true,
        });
        this.calculateCacheSize();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline data store
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }

        // Create cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    } catch (error) {
      console.error('Error initializing offline database:', error);
      this.updateCapabilities({ storageAvailable: false });
    }
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      this.updateCapabilities({ isOnline });

      if (isOnline) {
        this.syncOfflineData();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();
  }

  /**
   * Update capabilities and notify listeners
   */
  private updateCapabilities(updates: Partial<OfflineCapabilities>): void {
    this.capabilities = { ...this.capabilities, ...updates };
    this.listeners.forEach(listener => listener(this.capabilities));
  }

  /**
   * Store data for offline use
   */
  async storeOfflineData(
    type: string,
    data: any,
    id?: string
  ): Promise<string> {
    if (!this.db) throw new Error('Offline storage not available');

    const offlineData: OfflineData = {
      id:
        id ||
        `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      synced: false,
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      const request = store.put(offlineData);

      request.onsuccess = () => {
        this.updateCapabilities({ hasUnsynced: true });
        this.calculateCacheSize();
        resolve(offlineData.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve offline data
   */
  async getOfflineData(type?: string): Promise<OfflineData[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');

      let request: IDBRequest;
      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache API response for offline use
   */
  async cacheResponse(
    key: string,
    data: any,
    ttl: number = 3600000
  ): Promise<void> {
    if (!this.db) return;

    const cacheData = {
      key,
      data,
      timestamp: new Date(),
      expiry: new Date(Date.now() + ttl),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.put(cacheData);
      request.onsuccess = () => {
        this.calculateCacheSize();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached response
   */
  async getCachedResponse(key: string): Promise<any | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (new Date() > result.expiry) {
          this.deleteCachedResponse(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete cached response
   */
  async deleteCachedResponse(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.delete(key);
      request.onsuccess = () => {
        this.calculateCacheSize();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync offline data when back online
   */
  private async syncOfflineData(): Promise<void> {
    if (!this.db || !this.capabilities.isOnline) return;

    const unsyncedData = await this.getUnsyncedData();
    if (unsyncedData.length === 0) {
      this.updateCapabilities({ hasUnsynced: false });
      return;
    }

    const syncStatus: SyncStatus = {
      inProgress: true,
      total: unsyncedData.length,
      completed: 0,
      errors: 0,
    };

    this.notifySyncListeners(syncStatus);

    for (const item of unsyncedData) {
      try {
        await this.syncItem(item);
        await this.markAsSynced(item.id);
        syncStatus.completed++;
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);
        await this.incrementRetryCount(item.id);
        syncStatus.errors++;
        syncStatus.lastError = error as Error;
      }

      this.notifySyncListeners({ ...syncStatus });
    }

    syncStatus.inProgress = false;
    this.notifySyncListeners(syncStatus);

    this.updateCapabilities({
      hasUnsynced: syncStatus.errors > 0,
      lastSync: new Date(),
    });
  }

  /**
   * Get unsynced data
   */
  private async getUnsyncedData(): Promise<OfflineData[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const index = store.index('synced');

      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: OfflineData): Promise<void> {
    // This would typically make an API call
    // For now, we'll simulate the sync
    console.log('Syncing item:', item);

    // In a real implementation, you'd make API calls based on item.type
    switch (item.type) {
      case 'preference':
        // await api.submitPreference(item.data);
        break;
      case 'safety_report':
        // await api.submitSafetyReport(item.data);
        break;
      case 'emergency_contact':
        // await api.updateEmergencyContact(item.data);
        break;
      default:
        console.warn('Unknown sync type:', item.type);
    }
  }

  /**
   * Mark item as synced
   */
  private async markAsSynced(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Increment retry count for failed items
   */
  private async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount++;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Calculate cache size
   */
  private async calculateCacheSize(): Promise<void> {
    if (!this.db) return;

    try {
      const estimate = await navigator.storage?.estimate();
      const usage = estimate?.usage || 0;
      this.updateCapabilities({ cacheSize: usage });
    } catch (error) {
      console.debug('Could not estimate storage usage:', error);
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiry');

      const now = new Date();
      const range = IDBKeyRange.upperBound(now);

      const request = index.openCursor(range);
      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          this.calculateCacheSize();
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add capabilities listener
   */
  addCapabilitiesListener(
    listener: (capabilities: OfflineCapabilities) => void
  ): () => void {
    this.listeners.add(listener);
    // Send current capabilities immediately
    listener(this.capabilities);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): OfflineCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Force sync offline data
   */
  async forcSync(): Promise<void> {
    if (this.capabilities.isOnline) {
      await this.syncOfflineData();
    }
  }

  // Static methods for test compatibility
  static isOnline(): boolean {
    return OfflineService.getInstance().getCapabilities().isOnline;
  }

  static getStoredData(key: string): any {
    // Return a promise that resolves to cached data
    return OfflineService.getInstance().getCachedResponse(key);
  }

  static async storeData(key: string, data: any): Promise<void> {
    await OfflineService.getInstance().cacheResponse(key, data);
  }

  static async syncData(): Promise<void> {
    await OfflineService.getInstance().forcSync();
  }

  static async clearStorage(): Promise<void> {
    const instance = OfflineService.getInstance();
    if (instance.db) {
      const transaction = instance.db.transaction(
        ['cache', 'offlineData'],
        'readwrite'
      );
      const cacheStore = transaction.objectStore('cache');
      const offlineStore = transaction.objectStore('offlineData');

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const clearCache = cacheStore.clear();
          clearCache.onsuccess = () => resolve();
          clearCache.onerror = () => reject(clearCache.error);
        }),
        new Promise<void>((resolve, reject) => {
          const clearOffline = offlineStore.clear();
          clearOffline.onsuccess = () => resolve();
          clearOffline.onerror = () => reject(clearOffline.error);
        }),
      ]);
    }
  }
}

/**
 * React hook for offline capabilities
 */
export function useOffline(): OfflineCapabilities & {
  storeOfflineData: (type: string, data: any, id?: string) => Promise<string>;
  getOfflineData: (type?: string) => Promise<OfflineData[]>;
  cacheResponse: (key: string, data: any, ttl?: number) => Promise<void>;
  getCachedResponse: (key: string) => Promise<any | null>;
  forceSync: () => Promise<void>;
  syncStatus: SyncStatus | null;
} {
  const [capabilities, setCapabilities] = useState<OfflineCapabilities>(() =>
    OfflineService.getInstance().getCapabilities()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const offlineService = OfflineService.getInstance();

    const removeCapabilitiesListener =
      offlineService.addCapabilitiesListener(setCapabilities);
    const removeSyncListener = offlineService.addSyncListener(setSyncStatus);

    // Clean expired cache on mount
    offlineService.cleanExpiredCache();

    return () => {
      removeCapabilitiesListener();
      removeSyncListener();
    };
  }, []);

  const offlineService = OfflineService.getInstance();

  return {
    ...capabilities,
    syncStatus,
    storeOfflineData: useCallback(
      offlineService.storeOfflineData.bind(offlineService),
      [offlineService]
    ),
    getOfflineData: useCallback(
      offlineService.getOfflineData.bind(offlineService),
      [offlineService]
    ),
    cacheResponse: useCallback(
      offlineService.cacheResponse.bind(offlineService),
      [offlineService]
    ),
    getCachedResponse: useCallback(
      offlineService.getCachedResponse.bind(offlineService),
      [offlineService]
    ),
    forceSync: useCallback(offlineService.forcSync.bind(offlineService), [
      offlineService,
    ]),
  };
}

export { OfflineService };
export default OfflineService;
