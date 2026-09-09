import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

// Exam-specific eligibility (spec sections 15-23): upload -> validate/preview
// (valid/duplicate/unknown counts) -> explicit confirm -> import. The CSV
// itself is never treated as runtime authorization storage; only the
// imported ExamEligibility records are.
export default function EligibilityTab() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('ADD');
  const [eligible, setEligible] = useState({ items: [], total: 0 });
  const [manualUid, setManualUid] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    adminApi.listExams().then((res) => setExams(res.data.items || [])).catch((err) => setError(err.message));
  }, []);

  const loadEligible = useCallback((id) => {
    if (!id) return;
    adminApi.listEligibility(id).then((res) => setEligible(res.data || { items: [], total: 0 })).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadEligible(examId);
    setPreview(null);
  }, [examId, loadEligible]);

  async function handlePreview(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!file) {
      setError('Choose a CSV file first');
      return;
    }
    try {
      const res = await adminApi.previewEligibilityCsv(examId, file);
      setPreview(res.data);
    } catch (err) {
      setError(err.message || 'Could not validate CSV');
    }
  }

  async function handleImport() {
    if (!preview) return;
    if (mode === 'REPLACE' && !window.confirm('This will REPLACE the entire eligibility list for this exam. Continue?')) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await adminApi.importEligibility(examId, {
        mode,
        validRows: preview.valid,
        sourceFileName: file?.name,
      });
      setMessage(`Imported ${res.data.insertedCount} student(s). Total eligible: ${res.data.totalEligible}.`);
      setPreview(null);
      setFile(null);
      loadEligible(examId);
    } catch (err) {
      setError(err.message || 'Could not import eligibility');
    }
  }

  async function handleManualAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.addEligibleStudent(examId, manualStudentId, manualUid);
      setManualUid('');
      setManualStudentId('');
      loadEligible(examId);
    } catch (err) {
      setError(err.message || 'Could not add student');
    }
  }

  async function handleRemove(studentId) {
    setError(null);
    try {
      await adminApi.removeEligibleStudent(examId, studentId);
      loadEligible(examId);
    } catch (err) {
      setError(err.message || 'Could not remove student');
    }
  }

  return (
    <div>
      <h2>Exam Eligibility</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Eligibility is specific to this examination — a registered student is not automatically
        eligible for every exam. Upload a CSV with a single <code>uid</code> column.
      </p>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div className="form-field">
        <label>Examination</label>
        <select value={examId} onChange={(e) => setExamId(e.target.value)}>
          <option value="">Select an exam…</option>
          {exams.map((ex) => (
            <option key={ex._id} value={ex._id}>{ex.subjectCode} — {ex.examType} ({ex.status})</option>
          ))}
        </select>
      </div>

      {examId && (
        <>
          <form onSubmit={handlePreview} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
            <button className="btn-secondary" type="submit">Validate CSV</button>
          </form>

          {preview && (
            <div style={{ marginBottom: 16 }}>
              <p>
                Total rows: <strong>{preview.totalRows}</strong> · Valid: <strong>{preview.validCount}</strong> ·
                Duplicates: <strong>{preview.duplicateCount}</strong> · Unknown UIDs: <strong>{preview.unknownCount}</strong>
              </p>
              {(preview.duplicates.length > 0 || preview.unknown.length > 0) && (
                <details>
                  <summary>View error report</summary>
                  <ul>
                    {preview.unknown.map((r, i) => <li key={`u-${i}`}>Row {r.rowNumber} | {r.uid} | {r.reason}</li>)}
                    {preview.duplicates.map((r, i) => <li key={`d-${i}`}>Row {r.rowNumber} | {r.uid} | {r.reason}</li>)}
                  </ul>
                </details>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <label><input type="radio" checked={mode === 'ADD'} onChange={() => setMode('ADD')} /> Add to existing</label>
                <label><input type="radio" checked={mode === 'REPLACE'} onChange={() => setMode('REPLACE')} /> Replace eligibility</label>
                <button className="btn-primary" type="button" onClick={handleImport} disabled={!preview.validCount}>
                  Confirm Import ({preview.validCount} student{preview.validCount === 1 ? '' : 's'})
                </button>
              </div>
            </div>
          )}

          <h3>Manually add a student</h3>
          <form onSubmit={handleManualAdd} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input placeholder="Student ObjectId" value={manualStudentId} onChange={(e) => setManualStudentId(e.target.value)} required />
            <input placeholder="UID" value={manualUid} onChange={(e) => setManualUid(e.target.value)} required />
            <button className="btn-secondary" type="submit">Add</button>
          </form>

          <h3>Eligible students ({eligible.total})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th>UID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(eligible.items || []).map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td>{item.studentId?.uid || item.uid}</td>
                  <td>{item.studentId?.name || '—'}</td>
                  <td>{item.studentId?.universityEmail || '—'}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleRemove(item.studentId?._id || item.studentId)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!(eligible.items || []).length && (
                <tr><td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>No eligible students yet.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
