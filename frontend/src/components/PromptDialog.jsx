import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function PromptDialog({ open, title, initialValue = '', onSubmit, onCancel, submitLabel = 'Save' }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (open) setValue(initialValue); }, [open, initialValue]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fadeIn p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm p-5 animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink dark:text-dark-ink font-display">{title}</h3>
          <button onClick={onCancel} className="text-muted hover:text-ink dark:hover:text-dark-ink"><X size={16} /></button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSubmit(value.trim()); }}
          className="input"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={!value.trim()} onClick={() => onSubmit(value.trim())}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
