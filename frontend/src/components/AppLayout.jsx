import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SearchModal from './SearchModal';
import PromptDialog from './PromptDialog';
import { ConfirmDialog } from './Feedback';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AppLayout({ title, activeConversationId, topBarRight, children, onConversationsChange }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refreshConversations = useCallback(async () => {
    try {
      const { conversations } = await api.listConversations();
      setConversations(conversations);
      onConversationsChange?.(conversations);
    } catch {
      // silent — sidebar just shows empty state
    }
  }, [onConversationsChange]);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNewChat = async () => {
    const { conversation } = await api.createConversation({});
    await refreshConversations();
    navigate(`/app/chat/${conversation.id}`);
  };

  const handleSelectConversation = (id) => {
    navigate(`/app/chat/${id}`);
    setMobileOpen(false);
  };

  const handleRename = async (value) => {
    await api.updateConversation(renameTarget.id, { title: value });
    setRenameTarget(null);
    refreshConversations();
    toast('Conversation renamed');
  };

  const handleDelete = async () => {
    await api.deleteConversation(deleteTarget.id);
    const wasActive = deleteTarget.id === activeConversationId;
    setDeleteTarget(null);
    await refreshConversations();
    toast('Conversation deleted');
    if (wasActive) navigate('/app');
  };

  const handleSelectDocFromSearch = (doc) => {
    setSearchOpen(false);
    navigate(`/app/documents?open=${doc.id}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas dark:bg-dark-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={(c) => setRenameTarget(c)}
        onDeleteConversation={(c) => setDeleteTarget(c)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} onOpenMobileSidebar={() => setMobileOpen(true)} right={topBarRight} />
        <div className="flex-1 min-h-0 flex">{children}</div>
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectDocument={handleSelectDocFromSearch}
        onSelectConversation={(id) => { setSearchOpen(false); handleSelectConversation(id); }}
      />
      <PromptDialog
        open={!!renameTarget}
        title="Rename conversation"
        initialValue={renameTarget?.title || ''}
        onSubmit={handleRename}
        onCancel={() => setRenameTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this conversation?"
        description="This will permanently delete the conversation and its messages."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
