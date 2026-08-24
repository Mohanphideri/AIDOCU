import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fadeIn p-4" onClick={onCancel}>
      <div
        className="card w-full max-w-sm p-6 animate-rise"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-danger/10' : 'bg-primary/10'} mb-4`}>
          <AlertTriangle size={18} className={danger ? 'text-danger' : 'text-primary'} />
        </div>
        <h3 className="text-base font-semibold text-ink dark:text-dark-ink font-display">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-muted dark:text-dark-muted">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`btn-primary ${danger ? '!bg-danger hover:!bg-red-600' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fadeIn">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light dark:bg-primary/10 mb-4">
        {Icon && <Icon size={24} className="text-primary" />}
      </div>
      <h3 className="text-base font-semibold text-ink dark:text-dark-ink font-display">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted dark:text-dark-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulseSoft rounded-lg bg-slate-200 dark:bg-dark-border ${className}`} />;
}
