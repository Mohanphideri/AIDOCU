import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

const ACCOUNT_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED'];

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 25;

  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [programmes, setProgrammes] = useState([]);
  const [programmeId, setProgrammeId] = useState('');

  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setError(null);
    const params = { page, limit };
    if (search.trim()) params.search = search.trim();
    if (accountStatus) params.accountStatus = accountStatus;
    if (programmeId) params.programmeId = programmeId;

    adminApi
      .listStudents(params)
      .then((res) => {
        setStudents(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => setError(err.message || 'Could not load students'));
  }, [page, search, accountStatus, programmeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi.listAcademic('programmes').then((res) => setProgrammes(res.data || [])).catch(() => {});
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleUpdateStatus(studentId) {
    setError(null);
    setMessage(null);
    try {
      await adminApi.updateStudentStatus(studentId, newStatus, reason);
      setMessage('Student status updated.');
      setEditingId(null);
      setReason('');
      load();
    } catch (err) {
      setError(err.message || 'Could not update student status');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h2>Student Management</h2>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div className="form-field" style={{ minWidth: 220 }}>
          <label>Search (name / UID / email)</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Priya or 21CS045" />
        </div>
        <div className="form-field" style={{ minWidth: 180 }}>
          <label>Account Status</label>
          <select value={accountStatus} onChange={(e) => { setAccountStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field" style={{ minWidth: 200 }}>
          <label>Programme</label>
          <select value={programmeId} onChange={(e) => { setProgrammeId(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {programmes.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" type="submit">Search</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Name</th>
            <th>UID</th>
            <th>Email</th>
            <th>Programme</th>
            <th>Semester</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{s.name}</td>
              <td>{s.uid}</td>
              <td>{s.universityEmail}</td>
              <td>{s.programmeId?.name || '—'}</td>
              <td>{s.semesterId?.name || '—'}</td>
              <td>{s.accountStatus}</td>
              <td>
                {editingId === s._id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      {ACCOUNT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <input
                      placeholder="Reason (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ minWidth: 160 }}
                    />
                    <button className="btn-primary" onClick={() => handleUpdateStatus(s._id)}>Save</button>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => { setEditingId(s._id); setNewStatus(s.accountStatus); setReason(''); }}
                  >
                    Change Status
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!students.length && (
            <tr>
              <td colSpan={7} style={{ color: 'var(--color-text-muted)' }}>No students found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {total > limit && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages} ({total} students)</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
