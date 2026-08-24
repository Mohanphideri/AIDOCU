import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileSearch, Eye, EyeOff, Mail, Lock, User, Check, X, ArrowLeft } from 'lucide-react';
import Captcha from '../components/Captcha';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /\d/.test(p), label: 'One number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: '', answer: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleCaptchaChange = useCallback((c) => setCaptcha(c), []);
  const passedRules = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);
  const strength = passedRules === 0 ? 0 : passedRules <= 2 ? 1 : passedRules <= 4 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['bg-slate-200', 'bg-danger', 'bg-warning', 'bg-success'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (passedRules < 5) return setError('Password does not meet all requirements.');
    if (!acceptTerms) return setError('Please accept the Terms of Service to continue.');
    if (!captcha.answer) return setError('Please complete the CAPTCHA.');
    setLoading(true);
    try {
      const data = await api.register({ name, email, password, confirmPassword, acceptTerms, captchaId: captcha.captchaId, captchaAnswer: captcha.answer });
      if (data.requiresVerification) {
        setStep('otp');
        toast('Verification code sent to your email.');
      } else {
        login(data.token, data.user); toast('Account created — welcome to DocumentAI!'); navigate('/app');
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault(); setError('');
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit verification code.');
    setLoading(true);
    try {
      const data = await api.verifyRegistration({ email, otp });
      login(data.token, data.user); toast('Email verified — welcome to DocumentAI!'); navigate('/app');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    setError(''); setLoading(true);
    try { await api.resendRegistrationOtp({ email }); toast('A new verification code was sent.'); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-canvas dark:bg-dark-canvas p-6">
      <div className="w-full max-w-md animate-rise">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"><FileSearch size={17} /></div><span className="font-display text-[17px] font-bold text-ink dark:text-dark-ink">DocumentAI</span></Link>
        <div className="card p-7 sm:p-8">
          {step === 'form' ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink dark:text-dark-ink text-center">Create your account</h1>
              <p className="mt-1.5 text-sm text-muted dark:text-dark-muted text-center">Start exploring your documents in minutes</p>
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div><label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Full name</label><div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input required value={name} onChange={(e) => setName(e.target.value)} className="input auth-input-left" placeholder="Jane Doe" autoComplete="name" /></div></div>
                <div><label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Email</label><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input auth-input-left" placeholder="you@company.com" autoComplete="email" /></div></div>
                <div><label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Password</label><div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input auth-input-left auth-input-right" placeholder="••••••••" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-dark-ink">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{password && <div className="mt-2"><div className="flex gap-1">{[0,1,2].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-slate-200 dark:bg-dark-border'}`} />)}</div><p className="mt-1 text-xs text-muted dark:text-dark-muted">{strengthLabel} password</p><ul className="mt-2 grid grid-cols-2 gap-1">{RULES.map((r) => { const passed = r.test(password); return <li key={r.label} className={`flex items-center gap-1 text-[11px] ${passed ? 'text-success' : 'text-muted dark:text-dark-muted'}`}>{passed ? <Check size={11} /> : <X size={11} />} {r.label}</li>; })}</ul></div>}</div>
                <div><label className="block text-sm font-medium text-ink dark:text-dark-ink mb-1.5">Confirm password</label><div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input auth-input-left" placeholder="••••••••" autoComplete="new-password" /></div>{confirmPassword && confirmPassword !== password && <p className="mt-1.5 text-xs text-danger">Passwords do not match</p>}</div>
                <Captcha onChange={handleCaptchaChange} />
                <label className="flex items-start gap-2 text-sm text-muted dark:text-dark-muted cursor-pointer select-none"><input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 rounded border-border text-primary focus:ring-primary/40" />I agree to the <span className="text-ink dark:text-dark-ink font-medium">Terms of Service</span> and <span className="text-ink dark:text-dark-ink font-medium">Privacy Policy</span></label>
                {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">{loading ? 'Sending verification code…' : 'Create Account'}</button>
              </form>
            </>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <button type="button" onClick={() => { setStep('form'); setError(''); }} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink dark:hover:text-dark-ink"><ArrowLeft size={15} /> Back</button>
              <div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary"><Mail size={22} /></div><h1 className="mt-4 font-display text-2xl font-bold text-ink dark:text-dark-ink">Verify your email</h1><p className="mt-2 text-sm text-muted dark:text-dark-muted">We sent a 6-digit code to <strong className="text-ink dark:text-dark-ink">{email}</strong>.</p></div>
              <input inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input text-center text-2xl tracking-[0.5em] font-semibold" placeholder="000000" />
              {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full !py-2.5">{loading ? 'Verifying…' : 'Verify & Create Account'}</button>
              <button type="button" onClick={resendOtp} disabled={loading} className="w-full text-sm font-medium text-primary hover:underline">Resend verification code</button>
              <p className="text-center text-xs text-muted dark:text-dark-muted">The code expires in 10 minutes.</p>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted dark:text-dark-muted">Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
