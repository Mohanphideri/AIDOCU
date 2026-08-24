import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileSearch, Plus, Search, FileText, Star, Clock, Settings, LogOut, X, Mail,
  PanelLeft, MessageSquare, Trash2, Edit3, MoreHorizontal, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function groupByRecency(conversations) {
  const now = new Date();
  const today = [], yesterday = [], week = [], older = [];
  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    const diffDays = Number.isNaN(d.getTime()) ? 9999 : Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) today.push(c);
    else if (diffDays === 1) yesterday.push(c);
    else if (diffDays <= 7) week.push(c);
    else older.push(c);
  }
  return [
    { label: 'Today', items: today },
    { label: 'Yesterday', items: yesterday },
    { label: 'Previous 7 Days', items: week },
    { label: 'Older', items: older },
  ].filter((g) => g.items.length);
}

export default function Sidebar({
  collapsed, onToggleCollapse, mobileOpen, onCloseMobile,
  conversations, activeConversationId, onNewChat, onSelectConversation,
  onRenameConversation, onDeleteConversation, onOpenSearch,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const close = () => { setMenuOpenId(null); setProfileMenuOpen(false); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const groups = groupByRecency(conversations);

  const content = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2 px-4 h-16 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <FileSearch size={17} />
        </div>
        {!collapsed && <span className="font-display text-[16px] font-bold text-ink dark:text-dark-ink">DocumentAI</span>}
        <button onClick={onToggleCollapse} className="ml-auto hidden lg:flex btn-ghost !p-1.5" aria-label="Toggle sidebar">
          <PanelLeft size={16} />
        </button>
      </div>

      <div className="px-3 space-y-1">
        <button onClick={onNewChat} className={`btn-primary w-full ${collapsed ? '!px-0' : 'justify-start'}`} title="New Chat">
          <Plus size={16} /> {!collapsed && 'New Chat'}
        </button>
        <button onClick={onOpenSearch} className={`btn-ghost w-full border border-border dark:border-dark-border ${collapsed ? '!px-0 justify-center' : 'justify-start'}`} title="Search (Ctrl+K)">
          <Search size={16} /> {!collapsed && <span className="flex-1 text-left">Search</span>}
          {!collapsed && <kbd className="text-[10px] text-muted dark:text-dark-muted border border-border dark:border-dark-border rounded px-1.5 py-0.5">⌘K</kbd>}
        </button>
      </div>

      <div className="px-3 mt-4 space-y-1">
        <NavLink to="/app/documents" className={({ isActive }) => `btn-ghost w-full ${collapsed ? '!px-0 justify-center' : 'justify-start'} ${isActive ? '!bg-primary-light dark:!bg-primary/10 !text-primary' : ''}`} title="Documents">
          <FileText size={16} /> {!collapsed && 'All Documents'}
        </NavLink>
        <NavLink to="/app/documents?favorite=true" className={`btn-ghost w-full ${collapsed ? '!px-0 justify-center' : 'justify-start'}`} title="Favorites">
          <Star size={16} /> {!collapsed && 'Favorites'}
        </NavLink>
      </div>

      <div className="flex-1 overflow-y-auto px-3 mt-5 min-h-0">
        {!collapsed && (
          <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">Conversations</p>
        )}
        {groups.length === 0 && !collapsed && (
          <p className="px-2 text-sm text-muted dark:text-dark-muted">No conversations yet.</p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            {!collapsed && <p className="px-2 mb-1 text-[11px] text-muted dark:text-dark-muted">{g.label}</p>}
            {g.items.map((c) => (
              <div key={c.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(c.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors truncate text-left ${
                    activeConversationId === c.id ? 'bg-primary-light dark:bg-primary/10 text-primary font-medium' : 'text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={c.title}
                >
                  <MessageSquare size={15} className="shrink-0" />
                  {!collapsed && <span className="truncate flex-1">{c.title}</span>}
                </button>
                {!collapsed && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                      className="opacity-0 group-hover:opacity-100 btn-ghost !p-1"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpenId === c.id && (
                      <div className="absolute right-0 top-7 z-20 w-36 rounded-xl border border-border bg-surface shadow-popover dark:bg-dark-surface dark:border-dark-border p-1 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { onRenameConversation(c); setMenuOpenId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas">
                          <Edit3 size={13} /> Rename
                        </button>
                        <button onClick={() => { onDeleteConversation(c); setMenuOpenId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-danger hover:bg-danger/5">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border dark:border-dark-border p-3 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setProfileMenuOpen((o) => !o); }}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-canvas dark:hover:bg-dark-canvas transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink dark:text-dark-ink">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-muted dark:text-dark-muted">{user?.email || ''}</p>
              </div>
            )}
            {!collapsed && (
              <span className={`text-muted transition-transform duration-150 ${profileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className={`absolute bottom-[calc(100%+8px)] z-30 w-56 rounded-xl border border-border bg-surface shadow-popover dark:bg-dark-surface dark:border-dark-border p-1.5 animate-fadeIn ${collapsed ? 'left-0' : 'left-0 right-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-2 border-b border-border dark:border-dark-border mb-1.5">
                <p className="text-sm font-semibold text-ink dark:text-dark-ink truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted dark:text-dark-muted truncate">{user?.email || ''}</p>
              </div>

              <NavLink
                to="/app/settings"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
                className={({ isActive }) => `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas ${isActive ? '!text-primary !bg-primary-light dark:!bg-primary/10' : ''}`}
              >
                <Settings size={15} />
                <span>Settings</span>
              </NavLink>

              <button
                type="button"
                role="menuitem"
                onClick={() => { setProfileMenuOpen(false); setHelpOpen(true); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink dark:text-dark-ink hover:bg-canvas dark:hover:bg-dark-canvas"
              >
                <HelpCircle size={15} />
                <span>Help</span>
              </button>

              <div className="my-1.5 border-t border-border dark:border-dark-border" />

              <button
                type="button"
                role="menuitem"
                onClick={() => { setProfileMenuOpen(false); logout(); navigate('/'); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/5"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden lg:block h-screen sticky top-0 shrink-0 border-r border-border dark:border-dark-border bg-surface dark:bg-dark-surface transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-[272px]'}`}>
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fadeIn" onClick={onCloseMobile} />
          <aside className="relative w-[280px] h-full bg-surface dark:bg-dark-surface animate-rise">
            {content}
          </aside>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button type="button" aria-label="Close help" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-popover dark:bg-dark-surface dark:border-dark-border animate-rise">
            <button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} className="absolute right-4 top-4 btn-ghost !p-1.5">
              <X size={17} />
            </button>
            <div className="pr-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary"><HelpCircle size={20} /></div>
              <h2 className="mt-4 font-display text-xl font-semibold text-ink dark:text-dark-ink">Need help?</h2>
              <p className="mt-2 text-sm leading-6 text-muted dark:text-dark-muted">For support, questions, or technical assistance, email us and our team will help you.</p>
              <a href="mailto:docuaisupport@gmail.com" className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-canvas px-4 py-3 text-sm font-semibold text-primary hover:border-primary/40 dark:border-dark-border dark:bg-dark-canvas">
                <Mail size={16} /> docuaisupport@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
