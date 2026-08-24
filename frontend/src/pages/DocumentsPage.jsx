import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Search, FileText, Upload } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DocumentCard from '../components/DocumentCard';
import DocumentUpload from '../components/DocumentUpload';
import DocumentPanel from '../components/DocumentPanel';
import PromptDialog from '../components/PromptDialog';
import { ConfirmDialog, EmptyState, Spinner } from '../components/Feedback';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [showUpload, setShowUpload] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [panelDoc, setPanelDoc] = useState(null);

  const favorite = params.get('favorite') === 'true';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { documents } = await api.listDocuments({
        ...(query ? { q: query } : {}),
        ...(favorite ? { favorite: 'true' } : {}),
        sort,
      });
      setDocuments(documents);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [query, favorite, sort, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const openId = params.get('open');
    if (openId && documents.length) {
      const doc = documents.find((d) => d.id === openId);
      if (doc) setPanelDoc(doc);
    }
  }, [params, documents]);

  const handleOpenChat = async (doc) => {
    const { conversation } = await api.createConversation({ documentId: doc.id, title: doc.name.slice(0, 60) });
    navigate(`/app/chat/${conversation.id}`);
  };

  const handleToggleFavorite = async (doc) => {
    await api.updateDocument(doc.id, { isFavorite: !doc.isFavorite });
    refresh();
  };

  const handleRename = async (value) => {
    await api.updateDocument(renameTarget.id, { name: value });
    setRenameTarget(null);
    refresh();
    toast('Document renamed');
  };

  const handleDelete = async () => {
    await api.deleteDocument(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
    toast('Document deleted');
  };

  const handleDownload = (doc) => {
    const link = window.document.createElement('a');
    link.href = api.downloadUrl(doc.id);
    link.click();
  };

  return (
    <AppLayout title="Documents">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="input pl-9"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto text-sm">
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: Name</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-border dark:border-dark-border p-1 ml-auto">
            <button onClick={() => setView('grid')} className={`btn-ghost !p-1.5 ${view === 'grid' ? '!bg-primary-light dark:!bg-primary/10 !text-primary' : ''}`}><LayoutGrid size={15} /></button>
            <button onClick={() => setView('list')} className={`btn-ghost !p-1.5 ${view === 'list' ? '!bg-primary-light dark:!bg-primary/10 !text-primary' : ''}`}><List size={15} /></button>
          </div>
          <button onClick={() => setShowUpload((s) => !s)} className="btn-primary">
            <Upload size={15} /> Upload
          </button>
        </div>

        {showUpload && (
          <div className="mb-6">
            <DocumentUpload compact onUploaded={() => { setShowUpload(false); refresh(); toast('Document uploaded and processed successfully'); }} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={24} className="text-primary" /></div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={favorite ? 'No favorite documents' : 'No documents yet'}
            description={favorite ? 'Star a document to see it here.' : 'Upload your first document to start exploring it with DocumentAI.'}
            action={!favorite && <button onClick={() => setShowUpload(true)} className="btn-primary"><Upload size={15} /> Upload Document</button>}
          />
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2.5'}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                view={view}
                onOpenChat={handleOpenChat}
                onOpenSummary={(d) => setPanelDoc(d)}
                onRename={(d) => setRenameTarget(d)}
                onDownload={handleDownload}
                onDelete={(d) => setDeleteTarget(d)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {panelDoc && (
        <DocumentPanel document={panelDoc} initialTab="summary" onClose={() => { setPanelDoc(null); setParams({}); }} />
      )}

      <PromptDialog
        open={!!renameTarget}
        title="Rename document"
        initialValue={renameTarget?.name || ''}
        onSubmit={handleRename}
        onCancel={() => setRenameTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this document?"
        description="This will permanently delete the document and remove it from any conversations."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
