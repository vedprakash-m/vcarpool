import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Notification as RTNotification } from '@carpool/shared';
import toast from 'react-hot-toast';

interface NotificationContextValue {
  notifications: RTNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<RTNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PUBSUB_WS || '';
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = evt => {
      try {
        const n: RTNotification = JSON.parse(evt.data);
        setNotifications(prev => [n, ...prev]);
        toast.custom(t => (
          <div
            className={`bg-white shadow-lg rounded-lg px-4 py-3 border border-gray-200 flex items-start space-x-3 ${t.visible ? 'animate-enter' : 'animate-leave'}`}
          >
            <div className="text-primary-500 mt-0.5">🔔</div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{n.type}</p>
            </div>
          </div>
        ));
      } catch (err) {
        console.error('Invalid notification', err);
      }
    };

    ws.onerror = e => console.error('WebSocket error', e);
    ws.onclose = () => console.log('WebSocket closed');

    return () => ws.close();
  }, []);

  const markRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const value: NotificationContextValue = {
    notifications,
    markRead,
    markAllRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      'useNotifications must be used within NotificationProvider'
    );
  return ctx;
};
