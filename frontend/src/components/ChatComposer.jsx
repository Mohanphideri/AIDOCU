import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square } from 'lucide-react';

export default function ChatComposer({ onSend, disabled, documentName, onAttach, processing }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div className="border-t border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-4 sm:px-6 py-4">
      {documentName && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted dark:text-dark-muted">
          <Paperclip size={12} /> Document: <span className="font-medium text-ink dark:text-dark-ink">{documentName}</span>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-border dark:border-dark-border bg-canvas dark:bg-dark-canvas px-3 py-2 focus-within:border-primary transition-colors">
        <button onClick={onAttach} className="btn-ghost !p-2 shrink-0" title="Attach document">
          <Paperclip size={17} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={processing ? 'Waiting for document to finish processing…' : 'Ask anything about your document...'}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-ink dark:text-dark-ink placeholder:text-muted outline-none py-1.5 max-h-40 disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none"
          title="Send"
        >
          {processing ? <Square size={14} /> : <Send size={15} />}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted dark:text-dark-muted text-center">Enter to send · Shift + Enter for new line</p>
    </div>
  );
}
