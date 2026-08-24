import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const ACCEPTED = '.pdf,.docx,.txt,.csv';

export default function DocumentUpload({ onUploaded, compact = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    setProgressLabel('Uploading…');
    try {
      const { document } = await api.uploadDocument(file);
      setProgressLabel('Processing document…');
      // Poll for processing completion
      let attempts = 0;
      let current = document;
      while ((current.processingStatus === 'processing' || current.processingStatus === 'pending') && attempts < 120) {
        await new Promise((r) => setTimeout(r, 900));
        const { document: refreshed } = await api.getDocument(document.id);
        current = refreshed;
        attempts++;
      }
      if (current.processingStatus === 'error') {
        setError(current.processingError || 'Processing failed for this document.');
      } else if (current.processingStatus === 'ready') {
        onUploaded?.(current);
      } else {
        setError('The document is taking longer than expected. It is still processing in the background. Refresh the documents list to see when it is ready.');
        onUploaded?.(current);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgressLabel('');
    }
  }, [onUploaded]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-colors ${compact ? 'p-6' : 'p-10'} text-center ${
        dragOver ? 'border-primary bg-primary-light dark:bg-primary/10' : 'border-border dark:border-dark-border hover:border-primary/50 bg-surface dark:bg-dark-surface'
      }`}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-ink dark:text-dark-ink">{progressLabel}</p>
        </div>
      ) : (
        <>
          <div className={`mx-auto flex items-center justify-center rounded-2xl bg-primary-light dark:bg-primary/10 ${compact ? 'h-10 w-10 mb-3' : 'h-14 w-14 mb-4'}`}>
            <UploadCloud size={compact ? 18 : 24} className="text-primary" />
          </div>
          <p className="font-medium text-ink dark:text-dark-ink text-sm">Drop your document here</p>
          <p className="mt-0.5 text-sm text-muted dark:text-dark-muted">or click to browse</p>
          <p className="mt-3 text-xs text-muted dark:text-dark-muted">PDF · DOCX · TXT · CSV</p>
          <button type="button" className="btn-secondary mt-4 !py-2 !px-4 text-sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose File
          </button>
        </>
      )}
      {error && (
        <div className="mt-3 flex items-center gap-2 justify-center text-sm text-danger">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  );
}
