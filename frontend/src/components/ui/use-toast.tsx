import * as React from 'react';
import { Toast, type ToastProps } from './toast';

interface ToastState {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastProps['variant'];
}

interface ToastContextType {
  toasts: ToastState[];
  toast: (props: Omit<ToastState, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const toast = React.useCallback((props: Omit<ToastState, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { ...props, id }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toastData => (
          <Toast
            key={toastData.id}
            variant={toastData.variant}
            title={toastData.title}
            description={toastData.description}
            onClose={() => dismiss(toastData.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
