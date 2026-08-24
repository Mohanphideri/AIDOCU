import React, { useState } from 'react';
import { X, Copy, Check, Link2, Globe2 } from 'lucide-react';

export default function ShareDialog({ open, conversation, loading, onEnable, onDisable, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const shareUrl = conversation?.shareId
    ? `${window.location.origin}/share/${conversation.shareId}`
    : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fadeIn p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink dark:text-dark-ink font-display flex items-center gap-1.5">
            <Link2 size={15} className="text-primary" /> Share this chat
          </h3>
          <button onClick={onClose} className="text-muted hover:text-ink dark:hover:text-dark-ink">
            <X size={16} />
          </button>
        </div>

        {conversation?.isPublic && shareUrl ? (
          <>
            <p className="text-xs text-muted dark:text-dark-muted mb-3 flex items-start gap-1.5">
              <Globe2 size={13} className="text-success mt-0.5 shrink-0" />
              Anyone with this link can view this conversation — no sign-in required.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="input flex-1 text-xs"
              />
              <button onClick={handleCopy} className="btn-secondary !px-2.5 shrink-0" title="Copy link">
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={onDisable}
              disabled={loading}
              className="mt-4 text-xs font-medium text-danger hover:underline disabled:opacity-50"
            >
              Turn off link sharing
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted dark:text-dark-muted mb-4">
              Create a public link so anyone can view this conversation without signing in.
            </p>
            <button onClick={onEnable} disabled={loading} className="btn-primary w-full !py-2 disabled:opacity-60">
              {loading ? 'Creating link…' : 'Create share link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
