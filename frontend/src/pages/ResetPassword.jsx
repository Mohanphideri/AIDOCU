import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileSearch, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

const RULES = [
  { label: '8+ characters', test: (v) => v.length >= 8 },
  { label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'Number', test: (v) => /\d/.test(v) },
  { label: 'Special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function ResetPassword() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const passedRules = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (passedRules !== RULES.length) return setError('Password does not meet all requirements.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-canvas dark:bg-dark-canvas p-6">
      <div className="w-full max-w-md animate-rise">
        <div className="rounded-2xl border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-7 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white mb-5">
            <FileSearch size={21} />
          </div>
          {!success ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink">Create a new password</h1>
              <p className="mt-2 text-sm leading-6 text-muted dark:text-dark-muted">Choose a strong password for your DocumentAI account.</p>
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">New password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input auth-input-left auth-input-right" placeholder="••••••••" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  {password && <div className="mt-3 grid grid-cols-2 gap-1.5">{RULES.map((r) => <span key={r.label} className={`text-xs ${r.test(password) ? 'text-emerald-600' : 'text-muted'}`}>{r.test(password) ? '✓' : '○'} {r.label}</span>)}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input auth-input-left auth-input-right" placeholder="••••••••" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading || !token} className="btn-primary w-full !py-2.5">{loading ? 'Updating…' : 'Reset password'}</button>
              </form>
            </>
          ) : (
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-5"><CheckCircle2 size={23} /></div>
              <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink">Password updated</h1>
              <p className="mt-2 text-sm leading-6 text-muted dark:text-dark-muted">Your password has been reset successfully. All previous sessions have been invalidated.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full !py-2.5 mt-6">Continue to sign in</button>
            </div>
          )}
          {!success && <Link to="/login" className="block text-center text-sm text-primary hover:underline mt-5">Back to sign in</Link>}
        </div>
      </div>
    </div>
  );
}
