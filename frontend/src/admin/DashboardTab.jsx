import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

function StatCard({ label, value, tone }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '16px 20px',
        minWidth: 160,
        flex: '1 1 160px',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{label}</div>
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          marginTop: 4,
          color: tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? 'var(--color-gold)' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setError(null);
    Promise.all([adminApi.getDashboardStats(), adminApi.getProctoringAlerts(10)])
      .then(([statsRes, alertsRes]) => {
        setStats(statsRes.data);
        setAlerts(alertsRes.data || []);
      })
      .catch((err) => setError(err.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard…</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <button className="btn-secondary" type="button" onClick={load}>Refresh</button>
      </div>
      {error && <div className="error-text">{error}</div>}

      {stats && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, marginBottom: 28 }}>
            <StatCard label="Total Students" value={stats.totalStudents} />
            <StatCard label="Active Students" value={stats.activeStudents} />
            <StatCard label="Pending Verification" value={stats.pendingVerificationStudents} />
            <StatCard label="Live Exams" value={stats.liveExams} tone={stats.liveExams > 0 ? 'warning' : undefined} />
            <StatCard label="Scheduled Exams" value={stats.scheduledExams} />
            <StatCard label="Pending Queries" value={stats.pendingQueries} tone={stats.pendingQueries > 0 ? 'warning' : undefined} />
            <StatCard label="Proctoring Alerts" value={stats.proctoringAlerts} tone={stats.proctoringAlerts > 0 ? 'danger' : undefined} />
            <StatCard label="Faculty Submissions Pending" value={stats.pendingFacultySubmissions} />
          </div>

          <h3>Recent Proctoring Alerts</h3>
          {!alerts.length && <p style={{ color: 'var(--color-text-muted)' }}>No unreviewed proctoring alerts.</p>}
          {alerts.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th>Type</th>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Time</th>
                  <th>Review Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td>{a.type}</td>
                    <td>{a.studentId?.name ? `${a.studentId.name} (${a.studentId.uid})` : '—'}</td>
                    <td>{a.examId?.subjectCode ? `${a.examId.subjectCode} — ${a.examId.examType}` : '—'}</td>
                    <td>{a.serverTimestamp ? new Date(a.serverTimestamp).toLocaleString() : '—'}</td>
                    <td>{a.reviewStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
