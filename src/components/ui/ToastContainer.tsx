import { useState, useEffect } from 'react';
import Toast, { ToastType } from './Toast';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

/**
 * ToastContainer component for managing multiple toast notifications
 */
const ToastContainer = ({
  position = 'top-right',
  className = '',
}: ToastContainerProps) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Add toast
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);
    return id;
  };

  // Remove toast
  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // Expose methods to window for global access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showToast = (message: string, type: ToastType = 'info', duration = 5000) => {
        return addToast({ message, type, duration });
      };
      window.closeToast = removeToast;
    }

    return () => {
      if (typeof window !== 'undefined') {
        (window as Record<string, unknown>).showToast = undefined;
        (window as Record<string, unknown>).closeToast = undefined;
      }
    };
  }, []);

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-4 ${className}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Add type definitions for global functions
declare global {
  interface Window {
    showToast: (message: string, type?: ToastType, duration?: number) => string;
    closeToast: (id: string) => void;
  }
}

export default ToastContainer;