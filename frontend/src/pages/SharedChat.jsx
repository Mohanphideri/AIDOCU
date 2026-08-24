import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileSearch, Lock, MessageSquareText } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import { EmptyState, Spinner } from '../components/Feedback';
import { api } from '../services/api';

export default function SharedChat() {
  const { shareId } = useParams();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getSharedConversation(shareId)
      .then(({ conversation, messages }) => {
        if (cancelled) return;
        setConversation(conversation);
        setMessages(messages);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'This shared link is invalid or is no longer public.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shareId]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-dark-canvas">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border dark:border-dark-border bg-surface/90 backdrop-blur-md dark:bg-dark-surface/90 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <FileSearch size={17} />
          </div>
          <span className="font-display text-[17px] font-bold text-ink dark:text-dark-ink">DocumentAI</span>
        </Link>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted dark:text-dark-muted rounded-full border border-border dark:border-dark-border px-2.5 py-1">
          <Lock size={11} /> Read-only shared view
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size={24} className="text-primary" /></div>
          ) : error ? (
            <div className="mt-10 animate-rise">
              <EmptyState icon={Lock} title="Link unavailable" description={error} />
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold text-ink dark:text-dark-ink mb-1 animate-rise">{conversation?.title || 'Shared conversation'}</h1>
              <p className="text-xs text-muted dark:text-dark-muted mb-6 animate-rise">Shared from DocumentAI</p>

              {messages.length === 0 ? (
                <EmptyState icon={MessageSquareText} title="No messages" description="This conversation doesn't have any messages yet." />
              ) : (
                <div className="space-y-5">
                  {messages.map((m) => (
                    <ChatMessage key={m.id} message={m} readOnly />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
