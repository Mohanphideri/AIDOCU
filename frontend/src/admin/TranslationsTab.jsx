import React, { useState } from 'react';
import * as adminApi from '../services/adminApiService';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
];

// Translations are only generated after a paper is locked (spec section 35).
// Students only ever see APPROVED translations — review/approve here is what
// makes that gate meaningful.
export default function TranslationsTab() {
  const [paperId, setPaperId] = useState('');
  const [languages, setLanguages] = useState(['hi']);
  const [translations, setTranslations] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  function toggleLanguage(code) {
    setLanguages((prev) => (prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]));
  }

  async function loadTranslations() {
    setError(null);
    try {
      const res = await adminApi.listTranslationsForPaper(paperId);
      setTranslations(res.data || []);
    } catch (err) {
      setError(err.message || 'Could not load translations');
    }
  }

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    try {
      await adminApi.generateTranslations({ paperId, languages });
      setMessage('Translations generated. Review and approve them below.');
      loadTranslations();
    } catch (err) {
      setError(err.message || 'Could not generate translations');
    }
  }

  async function handleApprove(translationId) {
    setError(null);
    try {
      await adminApi.approveTranslation(translationId);
      loadTranslations();
    } catch (err) {
      setError(err.message || 'Could not approve translation');
    }
  }

  async function handleRegenerate(translationId) {
    setError(null);
    try {
      await adminApi.regenerateTranslation(translationId);
      loadTranslations();
    } catch (err) {
      setError(err.message || 'Could not regenerate translation');
    }
  }

  return (
    <div>
      <h2>Translation Review</h2>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div className="form-field">
        <label>Locked Paper ID</label>
        <input value={paperId} onChange={(e) => setPaperId(e.target.value)} placeholder="Paste the locked paper's _id" />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {LANGUAGES.map((l) => (
          <label key={l.code}>
            <input type="checkbox" checked={languages.includes(l.code)} onChange={() => toggleLanguage(l.code)} /> {l.label}
          </label>
        ))}
      </div>

      <button className="btn-primary" type="button" onClick={handleGenerate} disabled={!paperId} style={{ marginRight: 8 }}>
        Generate Translations
      </button>
      <button className="btn-secondary" type="button" onClick={loadTranslations} disabled={!paperId}>
        Load Existing
      </button>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Language</th>
            <th>Question (translated)</th>
            <th>Version</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {translations.map((t) => (
            <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{t.language}</td>
              <td style={{ maxWidth: 320 }}>{t.questionText}</td>
              <td>v{t.versionNumber}</td>
              <td>{t.status}</td>
              <td>
                {t.status !== 'APPROVED' && (
                  <>
                    <button className="btn-primary" style={{ marginRight: 8 }} onClick={() => handleApprove(t._id)}>Approve</button>
                    <button className="btn-secondary" onClick={() => handleRegenerate(t._id)}>Regenerate</button>
                  </>
                )}
                {t.status === 'APPROVED' && <span className="success-text">Approved</span>}
              </td>
            </tr>
          ))}
          {!translations.length && (
            <tr><td colSpan={5} style={{ color: 'var(--color-text-muted)' }}>No translations loaded yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
