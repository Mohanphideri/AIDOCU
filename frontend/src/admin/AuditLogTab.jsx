import React, { useState } from 'react';
import * as adminApi from '../services/adminApiService';

// Read-only, filterable view over the immutable AuditLog collection
// (spec section 75). Every sensitive admin action recorded elsewhere in
// this dashboard shows up here.
export default function AuditLogTab() {
  const [filters, setFilters] = useState({ entityType: '', action: '', actorId: '' });
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  async function search(nextPage = 1) {
    setError(null);
    try {
      const params = { page: nextPage, limit };
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.actorId) params.actorId = filters.actorId;
      const res = await adminApi.searchAudit(params);
      setEntries(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || 'Could not load audit log');
    }
  }

  return (
    <div>
      <h2>Audit Log</h2>
      {error && <div className="error-text">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Entity type (e.g. Exam, Result)"
          value={filters.entityType}
          onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
        />
        <input
          placeholder="Action (e.g. RESULT_PUBLICATION)"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <input
          placeholder="Actor ID"
          value={filters.actorId}
          onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
        />
        <button className="btn-primary" type="button" onClick={() => search(1)}>Search</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{new Date(e.timestamp).toLocaleString()}</td>
              <td>{e.actorRole} {e.actorId ? `(${e.actorId})` : ''}</td>
              <td>{e.action}</td>
              <td>{e.entityType} {e.entityId ? `#${e.entityId}` : ''}</td>
              <td style={{ maxWidth: 260, fontSize: '0.85em', color: 'var(--color-text-muted)' }}>
                {e.metadata ? JSON.stringify(e.metadata) : ''}
              </td>
            </tr>
          ))}
          {!entries.length && (
            <tr><td colSpan={5} style={{ color: 'var(--color-text-muted)' }}>No audit entries match these filters yet — try Search with no filters.</td></tr>
          )}
        </tbody>
      </table>

      {total > limit && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => search(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(total / limit)}</span>
          <button className="btn-secondary" disabled={page >= Math.ceil(total / limit)} onClick={() => search(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
