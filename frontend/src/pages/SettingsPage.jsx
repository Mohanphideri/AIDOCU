import React, { useState } from 'react';
import { User, Palette, MessageSquare, FileText, Shield, Sun, Moon, LogOut, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const { user, updateUser, logout, logoutAllSessions } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [active, setActive] = useState('account');
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [enterToSend, setEnterToSend] = useState(user?.settings?.enterToSend ?? true);
  const [autoScroll, setAutoScroll] = useState(user?.settings?.autoScroll ?? true);
  const [defaultSummaryLength, setDefaultSummaryLength] = useState(user?.settings?.defaultSummaryLength || 'medium');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { user: updated } = await api.updateProfile({ name });
      updateUser(updated);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveChatSettings = async (patch) => {
    try {
      const { user: updated } = await api.updateProfile({ settings: patch });
      updateUser(updated);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast('Password updated');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl flex justify-end mb-2">
          <button type="button" onClick={() => navigate('/app')} className="btn-secondary !p-2" aria-label="Close settings" title="Close settings">
            <X size={17} />
          </button>
        </div>
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active === s.id ? 'bg-primary-light dark:bg-primary/10 text-primary' : 'text-muted dark:text-dark-muted hover:bg-surface dark:hover:bg-dark-surface hover:text-ink dark:hover:text-dark-ink'
                }`}
              >
                <s.icon size={15} /> {s.label}
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {active === 'account' && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-ink dark:text-dark-ink mb-4">Account</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-xl font-semibold">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-ink dark:text-dark-ink">{user?.name}</p>
                    <p className="text-sm text-muted dark:text-dark-muted">{user?.email}</p>
                  </div>
                </div>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Email</label>
                    <input value={user?.email || ''} disabled className="input opacity-60" />
                  </div>
                  <button onClick={saveProfile} disabled={savingProfile} className="btn-primary">
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {active === 'appearance' && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-ink dark:text-dark-ink mb-4">Appearance</h2>
                <div className="flex gap-3">
                  <button onClick={() => setTheme('light')} className={`flex-1 rounded-xl border-2 p-4 text-left transition-colors ${theme === 'light' ? 'border-primary' : 'border-border dark:border-dark-border'}`}>
                    <Sun size={18} className="text-warning mb-2" />
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Light</p>
                    <p className="text-xs text-muted dark:text-dark-muted">Bright, premium default</p>
                  </button>
                  <button onClick={() => setTheme('dark')} className={`flex-1 rounded-xl border-2 p-4 text-left transition-colors ${theme === 'dark' ? 'border-primary' : 'border-border dark:border-dark-border'}`}>
                    <Moon size={18} className="text-primary mb-2" />
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Dark</p>
                    <p className="text-xs text-muted dark:text-dark-muted">Optional low-light theme</p>
                  </button>
                </div>
              </div>
            )}

            {active === 'chat' && (
              <div className="card p-6 space-y-5">
                <h2 className="font-display font-semibold text-ink dark:text-dark-ink">Chat</h2>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Enter to send</p>
                    <p className="text-xs text-muted dark:text-dark-muted">Press Enter to send messages, Shift+Enter for a new line</p>
                  </div>
                  <input type="checkbox" checked={enterToSend} onChange={(e) => { setEnterToSend(e.target.checked); saveChatSettings({ enterToSend: e.target.checked }); }} className="h-5 w-9 rounded-full" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Auto-scroll</p>
                    <p className="text-xs text-muted dark:text-dark-muted">Automatically scroll to new messages</p>
                  </div>
                  <input type="checkbox" checked={autoScroll} onChange={(e) => { setAutoScroll(e.target.checked); saveChatSettings({ autoScroll: e.target.checked }); }} className="h-5 w-9 rounded-full" />
                </label>
              </div>
            )}

            {active === 'documents' && (
              <div className="card p-6 space-y-4">
                <h2 className="font-display font-semibold text-ink dark:text-dark-ink">Documents</h2>
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Default summary length</label>
                  <select
                    value={defaultSummaryLength}
                    onChange={(e) => { setDefaultSummaryLength(e.target.value); saveChatSettings({ defaultSummaryLength: e.target.value }); }}
                    className="input max-w-xs"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>
            )}

            {active === 'security' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-ink dark:text-dark-ink mb-4">Change password</h2>
                  <div className="space-y-3 max-w-sm">
                    <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" />
                    <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
                    {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
                    <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword} className="btn-primary">
                      {changingPassword ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </div>
                <div className="card p-6">
                  <h2 className="font-display font-semibold text-ink dark:text-dark-ink mb-1">Sessions</h2>
                  <p className="text-sm text-muted dark:text-dark-muted mb-4">Sign out of DocumentAI on this device, or invalidate every active session (all devices) at once.</p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => { logout(); navigate('/'); }} className="btn-secondary !text-danger">
                      <LogOut size={15} /> Logout
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await logoutAllSessions();
                          toast('All other sessions have been signed out.');
                        } catch {
                          toast('Could not sign out other sessions. Please try again.');
                        }
                      }}
                      className="btn-secondary"
                    >
                      <Shield size={15} /> Logout all sessions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
