import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => remove(id), 3800);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 shadow-popover dark:bg-dark-surface dark:border-dark-border min-w-[240px] max-w-sm"
          >
            {t.type === 'success' && <CheckCircle2 size={18} className="text-success shrink-0" />}
            {t.type === 'error' && <XCircle size={18} className="text-danger shrink-0" />}
            {t.type === 'info' && <Info size={18} className="text-primary shrink-0" />}
            <p className="text-sm text-ink dark:text-dark-ink flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-muted hover:text-ink dark:hover:text-dark-ink">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
