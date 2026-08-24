import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Star, MoreHorizontal, MessageSquare, Sparkles, Edit3,
  Download, Trash2, Clock, Loader2, AlertCircle,
} from 'lucide-react';

const STATUS_STYLES = {
  ready: { label: 'Ready', className: 'text-success bg-success/10' },
  processing: { label: 'Processing', className: 'text-warning bg-warning/10' },
  pending: { label: 'Pending', className: 'text-warning bg-warning/10' },
  error: { label: 'Error', className: 'text-danger bg-danger/10' },
};

function parseDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function DocumentCard({ doc, view = 'grid', onOpenChat, onOpenSummary, onRename, onDownload, onDelete, onToggleFavorite }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const status = STATUS_STYLES[doc.processingStatus] || STATUS_STYLES.pending;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const menu = (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }} className="btn-ghost !p-1.5">
        <MoreHorizontal size={16} />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-surface shadow-popover dark:bg-dark-surface dark:border-dark-border p-1.5 animate-fadeIn">
          <button onClick={() => { onOpenChat(doc); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas"><MessageSquare size={13}/> Chat</button>
          <button onClick={() => { onOpenSummary(doc); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas"><Sparkles size={13}/> Summarize</button>
          <button onClick={() => { onRename(doc); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas"><Edit3 size={13}/> Rename</button>
          <button onClick={() => { onDownload(doc); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas"><Download size={13}/> Download</button>
          <button onClick={() => { onDelete(doc); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-danger hover:bg-danger/5"><Trash2 size={13}/> Delete</button>
        </div>
      )}
    </div>
  );

  if (view === 'list') {
    return (
      <div onClick={() => onOpenChat(doc)} className="card flex items-center gap-4 px-4 py-3 cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/10">
          <FileText size={17} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink dark:text-dark-ink">{doc.name}</p>
          <p className="text-xs text-muted dark:text-dark-muted">{doc.fileType?.toUpperCase()} · {formatBytes(doc.fileSize)} · {doc.pageCount || '—'} pages</p>
        </div>
        <span className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>{status.label}</span>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }} className="btn-ghost !p-1.5">
          <Star size={16} className={doc.isFavorite ? 'fill-warning text-warning' : ''} />
        </button>
        <div onClick={(e) => e.stopPropagation()}>{menu}</div>
      </div>
    );
  }

  return (
    <div onClick={() => onOpenChat(doc)} className="card p-4 cursor-pointer hover:border-primary/30 transition-colors flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/10">
          <FileText size={18} className="text-primary" />
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onToggleFavorite(doc)} className="btn-ghost !p-1.5">
            <Star size={15} className={doc.isFavorite ? 'fill-warning text-warning' : ''} />
          </button>
          {menu}
        </div>
      </div>
      <p className="text-sm font-medium text-ink dark:text-dark-ink truncate mb-1">{doc.name}</p>
      <p className="text-xs text-muted dark:text-dark-muted mb-3">{doc.fileType?.toUpperCase()} · {formatBytes(doc.fileSize)} · {doc.pageCount || '—'} pages</p>
      <div className="mt-auto flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
          {doc.processingStatus === 'processing' && <Loader2 size={10} className="animate-spin" />}
          {doc.processingStatus === 'error' && <AlertCircle size={10} />}
          {status.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted dark:text-dark-muted">
          <Clock size={11} /> {parseDate(doc.createdAt)?.toLocaleDateString() || '—'}
        </span>
      </div>
    </div>
  );
}
