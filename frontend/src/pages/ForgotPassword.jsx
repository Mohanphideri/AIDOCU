import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-dark-canvas p-6">
      <div className="w-full max-w-md animate-rise">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink mb-7">
          <ArrowLeft size={15} /> Back to sign in
        </Link>
        <div className="rounded-2xl border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-7 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white mb-5">
            <FileSearch size={21} />
          </div>
          {!sent ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink">Forgot your password?</h1>
              <p className="mt-2 text-sm leading-6 text-muted dark:text-dark-muted">
                Enter the email associated with your DocumentAI account and we'll send you a secure reset link.
              </p>
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@company.com" autoComplete="email" />
                  </div>
                </div>
                {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-5">
                <CheckCircle2 size={23} />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink">Check your email</h1>
              <p className="mt-2 text-sm leading-6 text-muted dark:text-dark-muted">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent. The link expires in 30 minutes.
              </p>
              <Link to="/login" className="btn-secondary w-full !py-2.5 mt-6 text-center">Back to sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
