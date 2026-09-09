import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listActiveExams } from '../services/examApiService';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveExams()
      .then((res) => setExams(res.data.items || []))
      .catch((err) => setError(err.message || 'Could not load examinations'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <h1>Student Dashboard</h1>
      <p>Welcome{user ? `, ${user.name}` : ''}.</p>

      <h2 style={{ marginTop: 32 }}>Available Examinations</h2>
      {error && <div className="error-text">{error}</div>}
      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

      {!loading && !exams.length && !error && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          There are no active examinations right now. This list only shows exams the university has
          made active — being listed here doesn&apos;t guarantee eligibility, which is checked when you
          start an exam.
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 0' }}>
                <strong>{exam.subjectCode}</strong> — {exam.examType}
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {exam.durationMinutes} minutes · {exam.maximumMarks} marks
                </div>
              </td>
              <td style={{ padding: '10px 0', textAlign: 'right' }}>
                <button className="btn-primary" onClick={() => navigate(`/exam/${exam._id}/security`)}>
                  Start Exam
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
