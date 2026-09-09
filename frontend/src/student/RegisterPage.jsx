import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerStudent } from '../services/studentAuthService';

const initialForm = {
  universityId: '',
  name: '',
  uid: '',
  universityEmail: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerStudent(form);
      navigate('/verify-email', { state: { studentId: res.data.studentId } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Student Registration</h1>
      <p>Register your university account. You will need your university-issued email address to complete verification.</p>

      {error && <div className="error-text">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="universityId">University</label>
          {/* In production this is a select populated from GET /api/... universities list */}
          <input id="universityId" name="universityId" value={form.universityId} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label htmlFor="name">Full Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label htmlFor="uid">UID</label>
          <input id="uid" name="uid" value={form.uid} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label htmlFor="universityEmail">University Email</label>
          <input
            id="universityEmail"
            type="email"
            name="universityEmail"
            value={form.universityEmail}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="phone">Phone Number</label>
          <input id="phone" name="phone" value={form.phone} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Register'}
        </button>
      </form>
    </div>
  );
}
