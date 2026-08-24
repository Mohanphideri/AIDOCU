import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, ListChecks, MessageSquareText, Hash, FileText, Share2, FileDown } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DocumentUpload from '../components/DocumentUpload';
import ChatMessage from '../components/ChatMessage';
import ChatComposer from '../components/ChatComposer';
import DocumentPanel from '../components/DocumentPanel';
import ShareDialog from '../components/ShareDialog';
import { EmptyState, Spinner } from '../components/Feedback';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

// Matches chat commands like "generate pdf", "make a pdf", "export pdf",
// "download this as pdf", etc. so users can trigger a PDF export just by
// typing it into the composer instead of hunting for a button.
const PDF_COMMAND_RE = /\b(generate|make|create|export|download)\b.{0,20}\bpdf\b/i;

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

const SUGGESTIONS = [
  { icon: Sparkles, label: 'Summarize a document' },
  { icon: ListChecks, label: 'Find important points' },
  { icon: MessageSquareText, label: 'Ask a question' },
  { icon: Hash, label: 'Extract information' },
];

export default function Workspace() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [document, setDocument] = useState(null);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [sending, setSending] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [panelState, setPanelState] = useState(null); // { tab, page }
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const scrollRef = useRef(null);

  const loadConversation = useCallback(async (id) => {
    setLoadingConvo(true);
    try {
      const { conversation, messages } = await api.getConversation(id);
      setConversation(conversation);
      setMessages(messages);
      if (conversation.documentId) {
        const { document } = await api.getDocument(conversation.documentId);
        setDocument(document);
      } else {
        setDocument(null);
      }
    } catch (err) {
      toast(err.message, 'error');
      navigate('/app');
    } finally {
      setLoadingConvo(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (conversationId) loadConversation(conversationId);
    else { setConversation(null); setMessages([]); setDocument(null); }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const { conversation: created } = await api.createConversation({});
    navigate(`/app/chat/${created.id}`, { replace: true });
    return created;
  };

  const handleExportPdf = async (convoOverride) => {
    const convo = convoOverride || conversation;
    if (!convo) return;
    setExportingPdf(true);
    try {
      const blob = await api.exportConversationPdf(convo.id);
      const filename = `${(convo.title || 'conversation').replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'conversation'}.pdf`;
      triggerBlobDownload(blob, filename);
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSend = async (content) => {
    // "generate pdf" / "make a pdf" / etc. is handled as a local command:
    // it exports + downloads the transcript instead of being sent through
    // the document Q&A pipeline (which would just say it found no answer).
    if (PDF_COMMAND_RE.test(content)) {
      const convo = await ensureConversation();
      const userEntry = { id: 'temp-' + Date.now(), role: 'user', content, sources: [] };
      setMessages((m) => [...m, userEntry]);
      setSending(true);
      const ok = await handleExportPdf(convo);
      setMessages((m) => [
        ...m,
        {
          id: 'pdf-' + Date.now(),
          role: 'assistant',
          content: ok
            ? "I've generated a PDF of this conversation and started the download."
            : "I couldn't generate the PDF just now — please try again.",
          sources: [],
        },
      ]);
      setSending(false);
      return;
    }

    setSending(true);
    try {
      const convo = await ensureConversation();
      setMessages((m) => [...m, { id: 'temp-' + Date.now(), role: 'user', content, sources: [] }]);
      const { userMessage, assistantMessage } = await api.sendMessage(convo.id, content);
      setMessages((m) => [...m.filter((x) => !x.id.toString().startsWith('temp-')), userMessage, assistantMessage]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleEnableShare = async () => {
    if (!conversation) return;
    setSharing(true);
    try {
      const { conversation: updated } = await api.shareConversation(conversation.id);
      setConversation(updated);
      toast('Share link created');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleDisableShare = async () => {
    if (!conversation) return;
    setSharing(true);
    try {
      const { conversation: updated } = await api.unshareConversation(conversation.id);
      setConversation(updated);
      toast('Link sharing turned off');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleRegenerate = async (messageId) => {
    if (!conversation) return;
    setRegeneratingId(messageId);
    try {
      const { message } = await api.regenerateMessage(conversation.id, messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? message : msg)));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleFeedback = async (messageId, feedback) => {
    setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg)));
    try {
      await api.setFeedback(messageId, feedback);
    } catch {
      // non-critical
    }
  };

  const handleUploaded = async (doc) => {
    toast('Document uploaded and processed successfully');
    const convo = await ensureConversation();
    await api.updateConversation(convo.id, { documentId: doc.id, title: doc.name.slice(0, 60) });
    loadConversation(convo.id);
  };

  const handleSuggestion = (label) => {
    if (!document) {
      toast('Upload a document first to use this action', 'info');
      return;
    }
    const map = {
      'Summarize a document': () => setPanelState({ tab: 'summary' }),
      'Find important points': () => setPanelState({ tab: 'keypoints' }),
      'Extract information': () => setPanelState({ tab: 'keywords' }),
      'Ask a question': () => document,
    };
    map[label]?.();
  };

  const handleOpenSource = (source) => setPanelState({ tab: 'source', page: source.page });

  const showEmptyState = !conversationId && !conversation;

  const topBarRight = conversation ? (
    <>
      <button
        onClick={() => handleExportPdf()}
        disabled={exportingPdf}
        className="btn-ghost !p-2 disabled:opacity-50"
        title="Export conversation as PDF"
      >
        <FileDown size={17} className={exportingPdf ? 'animate-pulse' : ''} />
      </button>
      <button
        onClick={() => setShareOpen(true)}
        className={`btn-ghost !p-2 ${conversation.isPublic ? '!text-primary' : ''}`}
        title="Share this conversation"
      >
        <Share2 size={17} />
      </button>
    </>
  ) : null;

  return (
    <AppLayout title={conversation?.title || 'New Chat'} activeConversationId={conversationId} topBarRight={topBarRight}>
      <div className="flex-1 flex flex-col min-w-0">
        {loadingConvo ? (
          <div className="flex-1 flex items-center justify-center"><Spinner size={24} className="text-primary" /></div>
        ) : showEmptyState ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
            <div className="w-full max-w-lg text-center animate-rise">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light dark:bg-primary/10 mb-5">
                <FileText size={24} className="text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-ink dark:text-dark-ink">Understand your documents.</h2>
              <p className="mt-1.5 text-sm text-muted dark:text-dark-muted">Ask anything. Upload a document and start exploring its content.</p>
              <div className="mt-6">
                <DocumentUpload onUploaded={handleUploaded} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} onClick={() => handleSuggestion(s.label)} className="flex items-center gap-2 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-3.5 py-2.5 text-sm text-ink dark:text-dark-ink hover:border-primary/40 hover:bg-primary-light/50 dark:hover:bg-primary/5 transition-colors text-left">
                    <s.icon size={15} className="text-primary shrink-0" /> {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
              {messages.length === 0 && (
                <EmptyState icon={MessageSquareText} title="No messages yet" description="Ask a question about the attached document to get started." />
              )}
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  onRegenerate={handleRegenerate}
                  onFeedback={handleFeedback}
                  onOpenSource={handleOpenSource}
                  regenerating={regeneratingId === m.id}
                />
              ))}
              {sending && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink dark:bg-dark-border text-white"><FileText size={14} /></div>
                  <div className="rounded-2xl rounded-tl-sm bg-canvas dark:bg-dark-canvas px-4 py-3 flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" />
                  </div>
                </div>
              )}
            </div>
            <ChatComposer
              onSend={handleSend}
              disabled={sending}
              documentName={document?.name}
              processing={document?.processingStatus === 'processing'}
              onAttach={() => navigate('/app/documents')}
            />
          </>
        )}
      </div>

      {panelState && document && (
        <DocumentPanel
          document={document}
          initialTab={panelState.tab}
          initialPage={panelState.page}
          onClose={() => setPanelState(null)}
        />
      )}

      <ShareDialog
        open={shareOpen}
        conversation={conversation}
        loading={sharing}
        onEnable={handleEnableShare}
        onDisable={handleDisableShare}
        onClose={() => setShareOpen(false)}
      />
    </AppLayout>
  );
}
