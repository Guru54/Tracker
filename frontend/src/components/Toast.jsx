import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle, border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  error: { icon: XCircle, border: 'border-rose-500/30', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  info: { icon: Info, border: 'border-primary-500/30', text: 'text-primary-400', bg: 'bg-primary-500/10' }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', duration = 4500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, duration) => push(msg, 'success', duration),
    error: (msg, duration) => push(msg, 'error', duration),
    info: (msg, duration) => push(msg, 'info', duration)
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => {
          const style = STYLES[t.type] || STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border 
                        ${style.border} ${style.bg} backdrop-blur-md bg-dark-900/95 shadow-xl 
                        animate-[fadeIn_0.15s_ease-out]`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.text}`} />
              <p className="text-sm text-dark-100 flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-dark-500 hover:text-dark-300 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// useToast().success('...') / .error('...') / .info('...')
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
