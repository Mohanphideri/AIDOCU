import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Sparkles, Hash, ListChecks, Copy, Download, Check } from 'lucide-react';
import { api } from '../services/api';
import { Spinner, Skeleton } from './Feedback';

const TABS = [
  { id: 'source', label: 'Source', icon: FileText },
  { id: 'summary', label: 'Summary', icon: Sparkles },
  { id: 'keypoints', label: 'Key Points', icon: ListChecks },
  { id: 'keywords', label: 'Keywords', icon: Hash },
];

export default function DocumentPanel({ document, initialTab = 'summary', initialPage, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [pageNum, setPageNum] = useState(initialPage || 1);
  const [pageText, setPageText] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const [summaryLength, setSummaryLength] = useState('medium');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [keyPoints, setKeyPoints] = useState(null);
  const [keywords, setKeywords] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    if (initialPage) setPageNum(initialPage);
  }, [initialTab, initialPage, document?.id]);

  const loadPage = useCallback(async (n) => {
    if (!document) return;
    setPageLoading(true);
    try {
      const data = await api.getSourcePage(document.id, n);
      setPageText(data.text);
    } catch {
      setPageText('This page could not be loaded.');
    } finally {
      setPageLoading(false);
    }
  }, [document]);

  useEffect(() => {
    if (tab === 'source' && document) loadPage(pageNum);
  }, [tab, pageNum, document, loadPage]);

  const loadSummary = useCallback(async (length) => {
    if (!document) return;
    setSummaryLoading(true);
    try {
      const data = await api.summarizeDocument(document.id, length);
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
  }, [document]);

  useEffect(() => {
    if (tab === 'summary' && document) loadSummary(summaryLength);
  }, [tab, document, summaryLength, loadSummary]);

  useEffect(() => {
    if (tab === 'keypoints' && document && !keyPoints) {
      api.getKeyPoints(document.id).then((d) => setKeyPoints(d.keyPoints));
    }
    if (tab === 'keywords' && document && !keywords) {
      api.getKeywords(document.id).then((d) => setKeywords(d.keywords));
    }
  }, [tab, document, keyPoints, keywords]);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary?.summary || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!document) return null;

  return (
    <aside className="w-full sm:w-[420px] shrink-0 h-full flex flex-col border-l border-border dark:border-dark-border bg-surface dark:bg-dark-surface animate-rise">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border dark:border-dark-border shrink-0">
        <FileText size={16} className="text-primary shrink-0" />
        <h2 className="font-medium text-sm text-ink dark:text-dark-ink truncate">{document.name}</h2>
        <button onClick={onClose} className="ml-auto btn-ghost !p-1.5"><X size={16} /></button>
      </div>

      <div className="flex border-b border-border dark:border-dark-border px-2 shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'source' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink dark:text-dark-ink">Page {pageNum} of {document.pageCount || 1}</span>
              <div className="flex gap-1">
                <button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)} className="btn-secondary !py-1 !px-2.5 text-xs">Prev</button>
                <button disabled={pageNum >= (document.pageCount || 1)} onClick={() => setPageNum((p) => p + 1)} className="btn-secondary !py-1 !px-2.5 text-xs">Next</button>
              </div>
            </div>
            {pageLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <div className="rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-dark-canvas p-4 text-sm leading-relaxed text-ink dark:text-dark-ink whitespace-pre-wrap">
                {pageText}
              </div>
            )}
          </div>
        )}

        {tab === 'summary' && (
          <div>
            <div className="flex gap-1.5 mb-4">
              {['short', 'medium', 'detailed'].map((l) => (
                <button
                  key={l}
                  onClick={() => setSummaryLength(l)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    summaryLength === l ? 'bg-primary text-white' : 'bg-canvas dark:bg-dark-canvas text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {summaryLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-ink dark:text-dark-ink whitespace-pre-wrap">{summary?.summary || 'No summary available.'}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={handleCopySummary} className="btn-secondary !py-1.5 !px-3 text-xs">
                    {copied ? <Check size={13} /> : <Copy size={13} />} Copy Summary
                  </button>
                  <a href={api.downloadUrl(document.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
                    <Download size={13} /> Download
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'keypoints' && (
          <div>
            {!keyPoints ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
            ) : keyPoints.length === 0 ? (
              <p className="text-sm text-muted dark:text-dark-muted">No key points could be extracted.</p>
            ) : (
              <ul className="space-y-3">
                {keyPoints.map((kp) => (
                  <li key={kp.rank} className="flex gap-3">
                    <span className="font-display text-sm font-bold text-primary/50 shrink-0">{String(kp.rank).padStart(2, '0')}</span>
                    <span className="text-sm text-ink dark:text-dark-ink leading-relaxed">{kp.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'keywords' && (
          <div>
            {!keywords ? (
              <div className="flex flex-wrap gap-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-7 w-20" />)}</div>
            ) : keywords.length === 0 ? (
              <p className="text-sm text-muted dark:text-dark-muted">No keywords could be extracted.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span key={k.keyword} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-light dark:bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                    {k.keyword}
                    <span className="text-primary/50">·{k.frequency}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
