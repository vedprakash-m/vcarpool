import { useEffect } from 'react';
import axios from 'axios';

export const usePushNotifications = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    )
      return;

    const register = async () => {
      try {
        const sw = await navigator.serviceWorker.register('/sw.js');
        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await axios.post('/api/push/subscribe', { userId, subscription });
      } catch (err) {
        console.error('Push subscription failed', err);
      }
    };

    register();
  }, [userId]);
};
