import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-slate-50 border-slate-200 text-slate-800',
};

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => onDismiss(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`border rounded-lg shadow-sm px-4 py-3 text-sm flex items-start gap-3 ${COLORS[toast.type]}`}
        >
          <span className="mt-0.5">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '⚠️'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <div className="flex-1 leading-relaxed">{toast.message}</div>
          <button
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={() => onDismiss(toast.id)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
