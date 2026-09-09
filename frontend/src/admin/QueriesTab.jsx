import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'RESOLVED'];

// Student exam queries (spec sections 70-74). A rejected query must never
// automatically punish the student — resolution is a neutral status change
// plus a free-text explanation, nothing more.
export default function QueriesTab() {
  const [queries, setQueries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [resolveText, setResolveText] = useState('');

  const load = useCallback(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    adminApi
      .listQueries(params)
      .then((res) => setQueries(res.data.items || []))
      .catch((err) => setError(err.message));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResolve(queryId) {
    setError(null);
    setMessage(null);
    try {
      await adminApi.resolveQuery(queryId, resolveStatus, resolveText);
      setMessage('Query resolved.');
      setResolvingId(null);
      setResolveText('');
      load();
    } catch (err) {
      setError(err.message || 'Could not resolve query');
    }
  }

  return (
    <div>
      <h2>Student Queries</h2>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div className="form-field" style={{ maxWidth: 260 }}>
        <label>Filter by status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Category</th>
            <th>Query</th>
            <th>Language</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {queries.map((q) => (
            <tr key={q._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{q.category}</td>
              <td style={{ maxWidth: 320 }}>{q.queryText}</td>
              <td>{q.language}</td>
              <td>{q.submittedAt ? new Date(q.submittedAt).toLocaleString() : '—'}</td>
              <td>{q.status}</td>
              <td>
                {!['RESOLVED', 'REJECTED'].includes(q.status) && (
                  <>
                    <button className="btn-primary" onClick={() => setResolvingId(q._id)}>Resolve</button>
                    {resolvingId === q._id && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)}>
                          {STATUSES.filter((s) => s !== 'SUBMITTED').map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input
                          placeholder="Resolution notes"
                          value={resolveText}
                          onChange={(e) => setResolveText(e.target.value)}
                          style={{ minWidth: 220 }}
                        />
                        <button className="btn-primary" onClick={() => handleResolve(q._id)}>Save</button>
                        <button className="btn-secondary" onClick={() => setResolvingId(null)}>Cancel</button>
                      </div>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
          {!queries.length && (
            <tr><td colSpan={6} style={{ color: 'var(--color-text-muted)' }}>No queries found.</td></tr>
          )}
        </tbody>
      </table>

      <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>
        If a query reveals a genuine issue (wrong answer key, invalid question, incorrect
        translation or marks), correct it via the Question Bank / Papers tabs, then use the
        <strong> Results</strong> tab to recalculate and re-finalize any affected result before
        republishing.
      </p>
    </div>
  );
}
