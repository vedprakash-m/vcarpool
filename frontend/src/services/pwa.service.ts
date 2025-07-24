/**
 * PWA Installation and Service Worker Management
 * Handles app installation prompts and PWA capabilities
 */

import { useState, useEffect } from 'react';

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  isStandalone: boolean;
}

class PWAService {
  private installPrompt: PWAInstallPrompt | null = null;
  private installListeners: Set<(canInstall: boolean) => void> = new Set();
  private onlineListeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeListeners();
    }
  }

  private initializeListeners(): void {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.installPrompt = e as any;
      this.notifyInstallListeners(true);
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.notifyInstallListeners(false);
    });

    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.notifyOnlineListeners(true);
    });

    window.addEventListener('offline', () => {
      this.notifyOnlineListeners(false);
    });
  }

  async promptInstall(): Promise<{
    outcome: 'accepted' | 'dismissed' | 'unavailable';
  }> {
    if (!this.installPrompt) {
      return { outcome: 'unavailable' };
    }

    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        this.installPrompt = null;
        this.notifyInstallListeners(false);
      }

      return choice;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return { outcome: 'unavailable' };
    }
  }

  getCapabilities(): PWACapabilities {
    if (typeof window === 'undefined') {
      return {
        isInstallable: false,
        isInstalled: false,
        isOnline: false,
        isServiceWorkerSupported: false,
        isStandalone: false,
      };
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window as any).navigator?.standalone === true;

    return {
      isInstallable: !!this.installPrompt,
      isInstalled: isStandalone,
      isOnline: navigator.onLine,
      isServiceWorkerSupported: 'serviceWorker' in navigator,
      isStandalone,
    };
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      // Try to register service worker with fallback for static exports
      const swPath = '/sw.js';

      // For production static export deployments, check if SW exists
      try {
        const swResponse = await fetch(swPath, { method: 'HEAD' });
        if (!swResponse.ok) {
          console.warn('Service worker not found, PWA features disabled');
          return null;
        }
      } catch (fetchError) {
        console.warn('Service worker not found, PWA features disabled');
        return null;
      }

      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  async requestPushPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribeToPush(
    registration: ServiceWorkerRegistration
  ): Promise<PushSubscription | null> {
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private notifyInstallListeners(canInstall: boolean): void {
    this.installListeners.forEach(listener => listener(canInstall));
  }

  private notifyOnlineListeners(isOnline: boolean): void {
    this.onlineListeners.forEach(listener => listener(isOnline));
  }

  private notifyUpdateAvailable(): void {
    // Could dispatch custom event or call registered callbacks
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  onInstallAvailable(listener: (canInstall: boolean) => void): void {
    this.installListeners.add(listener);
  }

  onOnlineStatusChange(listener: (isOnline: boolean) => void): void {
    this.onlineListeners.add(listener);
  }

  removeInstallListener(listener: (canInstall: boolean) => void): void {
    this.installListeners.delete(listener);
  }

  removeOnlineListener(listener: (isOnline: boolean) => void): void {
    this.onlineListeners.delete(listener);
  }
}

// React Hook for PWA functionality
export function usePWA() {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    isServiceWorkerSupported: false,
    isStandalone: false,
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const pwaService = new PWAService();

    // Update capabilities
    const updateCapabilities = () => {
      setCapabilities(pwaService.getCapabilities());
    };

    // Set up listeners
    pwaService.onInstallAvailable(updateCapabilities);
    pwaService.onOnlineStatusChange(updateCapabilities);

    // Listen for updates
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdate);

    // Register service worker
    pwaService.registerServiceWorker().then(setRegistration);

    // Initial capabilities check
    updateCapabilities();

    return () => {
      pwaService.removeInstallListener(updateCapabilities);
      pwaService.removeOnlineListener(updateCapabilities);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const promptInstall = async () => {
    const pwaService = new PWAService();
    return await pwaService.promptInstall();
  };

  const requestNotifications = async () => {
    const pwaService = new PWAService();
    const permission = await pwaService.requestPushPermission();

    if (permission === 'granted' && registration) {
      const subscription = await pwaService.subscribeToPush(registration);
      return { permission, subscription };
    }

    return { permission, subscription: null };
  };

  const reloadApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    capabilities,
    updateAvailable,
    promptInstall,
    requestNotifications,
    reloadApp,
    registration,
  };
}

export default PWAService;
