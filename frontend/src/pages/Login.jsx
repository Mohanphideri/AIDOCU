import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileSearch, Eye, EyeOff, Mail, Lock, Sparkles, Search, BookOpen } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Captcha from '../components/Captcha';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [captcha, setCaptcha] = useState({ captchaId: '', answer: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleCredential = useCallback(async (credential) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.googleLogin(credential);
      login(data.token, data.user);
      toast('Signed in with Google!');
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [login, navigate, toast]);

  const handleCaptchaChange = useCallback((c) => setCaptcha(c), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!captcha.answer) {
      setError('Please complete the CAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login({
        email, password, captchaId: captcha.captchaId, captchaAnswer: captcha.answer,
      });
      login(data.token, data.user);
      toast('Welcome back!');
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen grid lg:grid-cols-2 bg-canvas dark:bg-dark-canvas">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink dark:bg-dark-surface p-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_0%,rgba(99,91,255,0.25),transparent)]" />
        {/* Floating animated gradient blobs */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl animate-blob [animation-delay:-3s]" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl animate-blob [animation-delay:-6s]" />

        <Link to="/" className="flex items-center gap-2 relative animate-rise">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white animate-float">
            <FileSearch size={17} />
          </div>
          <span className="font-display text-[17px] font-bold text-white">DocumentAI</span>
        </Link>
        <div className="relative animate-rise [animation-delay:80ms] [animation-fill-mode:backwards]">
          <h2 className="font-display text-3xl font-bold text-white leading-tight max-w-sm">
            Ask your documents anything. Get answers you can trust.
          </h2>
          <p className="mt-4 text-slate-400 max-w-sm">
            Every answer is retrieved directly from your uploaded files using TF-IDF, BM25, and TextRank — no generative model, no hallucination.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Search, text: 'BM25-ranked retrieval across every page' },
              { icon: BookOpen, text: 'Extractive summaries built from real sentences' },
              { icon: Sparkles, text: 'Source citations for every answer' },
            ].map((f, i) => (
              <div
                key={f.text}
                className="flex items-center gap-3 text-sm text-slate-300 animate-rise [animation-fill-mode:backwards]"
                style={{ animationDelay: `${160 + i * 90}ms` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-transform hover:scale-110 hover:bg-white/15">
                  <f.icon size={15} className="text-primary" />
                </div>
                {f.text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} DocumentAI</p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <FileSearch size={17} />
            </div>
            <span className="font-display text-[17px] font-bold text-ink dark:text-dark-ink">DocumentAI</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '40ms' }}>
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted dark:text-dark-muted animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '80ms' }}>
            Sign in to continue to DocumentAI
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '120ms' }}>
              <label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input auth-input-left" placeholder="you@company.com" autoComplete="email"
                />
              </div>
            </div>
            <div className="animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink dark:text-dark-ink">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} className="input auth-input-left auth-input-right"
                  placeholder="••••••••" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-dark-ink transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted dark:text-dark-muted cursor-pointer select-none animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '190ms' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/40" />
              Remember me
            </label>

            <div className="animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '220ms' }}>
              <Captcha onChange={handleCaptchaChange} />
            </div>

            {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2 animate-rise">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 animate-rise [animation-fill-mode:backwards] transition-transform active:scale-[0.98]"
              style={{ animationDelay: '250ms' }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>

            <div className="animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '280ms' }}>
              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted dark:text-dark-muted animate-rise [animation-fill-mode:backwards]" style={{ animationDelay: '310ms' }}>
            Don't have an account? <Link to="/register" className="font-medium text-primary hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
