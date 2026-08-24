import React, { useMemo, useState } from 'react';
import { Copy, ThumbsUp, ThumbsDown, RefreshCcw, FileText, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function renderAssistantContent(content) {
  const lines = String(content || '').split(/\r?\n/);
  const nodes = [];
  let bullets = [];
  let numbered = [];

  const flushLists = () => {
    if (bullets.length) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="my-2 space-y-2 list-disc pl-5">
          {bullets.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      );
      bullets = [];
    }
    if (numbered.length) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-2 space-y-2 list-decimal pl-5">
          {numbered.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
      );
      numbered = [];
    }
  };

  const inline = (text) => {
    const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>);
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) { flushLists(); return; }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushLists();
      nodes.push(<h4 key={`h-${index}`} className="mt-3 mb-1.5 text-sm font-bold text-ink dark:text-dark-ink first:mt-0">{inline(heading[1])}</h4>);
      return;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) { numbered.length && flushLists(); bullets.push(inline(bullet[1])); return; }
    const num = line.match(/^\d+[.)]\s+(.+)$/);
    if (num) { bullets.length && flushLists(); numbered.push(inline(num[1])); return; }
    flushLists();
    nodes.push(<p key={`p-${index}`} className="my-1.5 first:mt-0 last:mb-0">{inline(line)}</p>);
  });
  flushLists();
  return nodes;
}

export default function ChatMessage({ message, onRegenerate, onFeedback, onOpenSource, regenerating, readOnly = false }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const rendered = useMemo(() => renderAssistantContent(message.content), [message.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 animate-rise">
        <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15 text-xs font-semibold text-primary">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-rise">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink dark:bg-dark-border text-white">
        <FileText size={14} />
      </div>
      <div className="max-w-[90%] sm:max-w-[78%] space-y-2.5">
        <div className="rounded-2xl rounded-tl-sm bg-canvas dark:bg-dark-canvas px-4 py-3 text-sm text-ink dark:text-dark-ink leading-relaxed">
          {rendered}
        </div>

        {message.sources?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-dark-muted mb-1.5">Sources</p>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((s, i) => (
                readOnly ? (
                  <span key={i} className="flex items-center gap-1 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-2.5 py-1 text-xs font-medium text-muted dark:text-dark-muted">
                    <FileText size={11} /> Page {s.page}{s.section ? ` · ${s.section}` : ''}
                  </span>
                ) : (
                  <button key={i} onClick={() => onOpenSource(s)} className="flex items-center gap-1 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-light dark:hover:bg-primary/10 transition-colors">
                    <FileText size={11} /> Page {s.page}{s.section ? ` · ${s.section}` : ''}
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="btn-ghost !p-1.5" title="Copy">{copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}</button>
            <button onClick={() => onFeedback(message.id, message.feedback === 'up' ? null : 'up')} className={`btn-ghost !p-1.5 ${message.feedback === 'up' ? '!text-success' : ''}`} title="Good response"><ThumbsUp size={14} /></button>
            <button onClick={() => onFeedback(message.id, message.feedback === 'down' ? null : 'down')} className={`btn-ghost !p-1.5 ${message.feedback === 'down' ? '!text-danger' : ''}`} title="Bad response"><ThumbsDown size={14} /></button>
            <button onClick={() => onRegenerate(message.id)} className="btn-ghost !p-1.5" title="Re-run retrieval" disabled={regenerating}><RefreshCcw size={14} className={regenerating ? 'animate-spin' : ''} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
