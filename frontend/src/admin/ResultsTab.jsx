import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

// Result review workflow: DRAFT -> UNDER_REVIEW -> FINALIZED -> (explicit
// admin action) -> PUBLISHED. This tab intentionally never auto-publishes —
// publishing stays a separate, confirmed action on the Exams tab per the
// spec's "impossible to misunderstand" rule (section 97).
export default function ResultsTab() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [correctionMarks, setCorrectionMarks] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  useEffect(() => {
    adminApi.listExams().then((res) => setExams(res.data.items || [])).catch((err) => setError(err.message));
  }, []);

  const loadResults = useCallback((id) => {
    if (!id) return;
    adminApi.listResultsForExam(id).then((res) => setResults(res.data || [])).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadResults(examId);
  }, [examId, loadResults]);

  async function handleFinalize(resultId) {
    setError(null);
    setMessage(null);
    try {
      await adminApi.finalizeResult(resultId);
      setMessage('Result finalized. It remains private until the exam\'s results are published.');
      loadResults(examId);
    } catch (err) {
      setError(err.message || 'Could not finalize result');
    }
  }

  async function submitCorrection(resultId) {
    setError(null);
    try {
      const marks = Number(correctionMarks);
      await adminApi.correctResult(resultId, { obtainedMarks: marks }, correctionReason || 'Manual correction');
      setCorrecting(null);
      setCorrectionMarks('');
      setCorrectionReason('');
      loadResults(examId);
    } catch (err) {
      setError(err.message || 'Could not correct result');
    }
  }

  return (
    <div>
      <h2>Results — Review, Correction &amp; Finalization</h2>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              <th>Student</th>
              <th>UID</th>
              <th>Marks</th>
              <th>%</th>
              <th>Grade</th>
              <th>Pass/Fail</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td>{r.studentId?.name || '—'}</td>
                <td>{r.studentId?.uid || '—'}</td>
                <td>{r.obtainedMarks} / {r.maximumMarks}</td>
                <td>{r.percentage}%</td>
                <td>{r.grade}</td>
                <td>{r.passFail}</td>
                <td>{r.status}</td>
                <td>
                  {['DRAFT', 'UNDER_REVIEW', 'UNDER_REVISION'].includes(r.status) && (
                    <button className="btn-primary" style={{ marginRight: 8 }} onClick={() => handleFinalize(r._id)}>
                      Finalize
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => setCorrecting(r._id)}>Correct</button>
                  {correcting === r._id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" placeholder="New obtained marks" value={correctionMarks} onChange={(e) => setCorrectionMarks(e.target.value)} />
                      <input placeholder="Reason" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
                      <button className="btn-primary" onClick={() => submitCorrection(r._id)}>Save</button>
                      <button className="btn-secondary" onClick={() => setCorrecting(null)}>Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!results.length && (
              <tr><td colSpan={8} style={{ color: 'var(--color-text-muted)' }}>No results calculated for this exam yet (results are created automatically once students submit).</td></tr>
            )}
          </tbody>
        </table>
      )}

      <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>
        Once every result you intend to release is FINALIZED, go to the <strong>Exams</strong> tab
        and use <strong>Publish Results</strong> — that is the only action that makes results
        visible to students and triggers result emails.
      </p>
    </div>
  );
}
