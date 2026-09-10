import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginStudent } from '../services/studentAuthService';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginStudent({ uid, password });
      login(res.data.student);
      const redirectTo = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Student Login</h1>

      {location.state?.justVerified && (
        <div className="success-banner">Your email has been verified. You may now log in.</div>
      )}
      {location.state?.justReset && (
        <div className="success-banner">Your password has been reset. You may now log in.</div>
      )}
      {error && <div className="error-text">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="uid">UID</label>
          <input id="uid" value={uid} onChange={(e) => setUid(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </div>
  );
}
