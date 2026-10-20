import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-up ${
              isError
                ? 'bg-red-950/90 border-red-800/60 text-red-100'
                : isSuccess
                ? 'bg-emerald-950/90 border-emerald-800/60 text-emerald-100'
                : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {isError && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-spotify-green shrink-0" />}
              <span className="text-sm font-medium leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-zinc-400 hover:text-white rounded-full transition-colors ml-3"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
