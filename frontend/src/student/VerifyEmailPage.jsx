import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/studentAuthService';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const studentId = location.state?.studentId;

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!studentId) {
    return (
      <div className="page-container">
        <h1>Verify Your Email</h1>
        <p>
          We couldn&apos;t find a pending registration. Please <a href="/register">register again</a>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmail({ studentId, code });
      navigate('/login', { state: { justVerified: true } });
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    try {
      await resendVerification(studentId);
      setInfo('A new verification code has been sent to your university email.');
    } catch (err) {
      setError(err.message || 'Could not resend code');
    }
  }

  return (
    <div className="page-container">
      <h1>Verify Your Email</h1>
      <p>Enter the 6-digit verification code sent to your university email address.</p>

      {info && <div className="success-banner">{info}</div>}
      {error && <div className="error-text">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="code">Verification Code</label>
          <input id="code" name="code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={8} required />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify Email'}
        </button>
      </form>

      <p>
        Didn&apos;t receive a code?{' '}
        <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: 'var(--color-navy)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
          Resend code
        </button>
      </p>
    </div>
  );
}
