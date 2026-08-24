import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, MessageSquare, X } from 'lucide-react';
import { api } from '../services/api';

export default function SearchModal({ open, onClose, onSelectDocument, onSelectConversation }) {
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState([]);
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        api.listDocuments(q ? { q } : {}),
        api.listConversations(q),
      ]);
      setDocs(d.documents.slice(0, 6));
      setConvos(c.conversations.slice(0, 6));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    runSearch('');
  }, [open, runSearch]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => runSearch(query), 220);
    return () => clearTimeout(t);
  }, [query, open, runSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-ink/40 backdrop-blur-sm pt-24 px-4 animate-fadeIn" onClick={onClose}>
      <div className="card w-full max-w-lg overflow-hidden animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-border dark:border-dark-border px-4 py-3">
          <Search size={17} className="text-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents and conversations…"
            className="flex-1 bg-transparent text-sm text-ink dark:text-dark-ink placeholder:text-muted outline-none"
          />
          <button onClick={onClose} className="text-muted hover:text-ink dark:hover:text-dark-ink"><X size={16} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && <p className="px-3 py-6 text-center text-sm text-muted dark:text-dark-muted">Searching…</p>}
          {!loading && docs.length === 0 && convos.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted dark:text-dark-muted">No results found.</p>
          )}
          {docs.length > 0 && (
            <div className="mb-2">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">Documents</p>
              {docs.map((d) => (
                <button key={d.id} onClick={() => onSelectDocument(d)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas text-left">
                  <FileText size={15} className="text-primary shrink-0" /> <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          )}
          {convos.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">Conversations</p>
              {convos.map((c) => (
                <button key={c.id} onClick={() => onSelectConversation(c.id)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas text-left">
                  <MessageSquare size={15} className="text-primary shrink-0" /> <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
