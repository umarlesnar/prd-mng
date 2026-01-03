'use client';

import { useState, useCallback } from 'react';
import { LuX, LuCheck, LuTriangle, LuInfo } from 'react-icons/lu';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: Set<(toast: Toast) => void> = new Set();

export const showToast = (message: string, type: ToastType = 'info') => {
  const id = `toast-${++toastId}`;
  const toast: Toast = { id, message, type };
  listeners.forEach(listener => listener(toast));
  
  setTimeout(() => {
    removeToast(id);
  }, 4000);
  
  return id;
};

export const removeToast = (id: string) => {
  listeners.forEach(listener => listener({ id, message: '', type: 'info' }));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleToast = useCallback((toast: Toast) => {
    if (toast.message) {
      setToasts(prev => [...prev, toast]);
    } else {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }
  }, []);

  useState(() => {
    listeners.add(handleToast);
    return () => listeners.delete(handleToast);
  });

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : toast.type === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && (
              <LuCheck className="w-5 h-5 text-green-600" />
            )}
            {toast.type === 'error' && (
              <LuTriangle className="w-5 h-5 text-red-600" />
            )}
            {toast.type === 'info' && (
              <LuInfo className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <p
            className={`text-sm font-medium flex-1 ${
              toast.type === 'success'
                ? 'text-green-800'
                : toast.type === 'error'
                ? 'text-red-800'
                : 'text-blue-800'
            }`}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className={`flex-shrink-0 ${
              toast.type === 'success'
                ? 'text-green-600 hover:text-green-700'
                : toast.type === 'error'
                ? 'text-red-600 hover:text-red-700'
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
