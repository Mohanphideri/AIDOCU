import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/studentAuthService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="page-container">
        <h1>Check your email</h1>
        <div className="success-banner">
          If that email is registered, we&apos;ve sent a password reset link. It expires soon, so use it right
          away.
        </div>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Forgot Password</h1>
      <p>Enter your university email and we&apos;ll send you a link to reset your password.</p>

      {error && <div className="error-text">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="email">University Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
