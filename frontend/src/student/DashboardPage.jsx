import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listActiveExams, listMyResults } from '../services/examApiService';
import { getMyProfile, logout as studentLogout } from '../services/studentAuthService';

const STATUS_REFRESH_INTERVAL_MS = 20000; // 15–30s is plenty; no per-second precision needed

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' });
}

function formatCountdown(ms) {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Purely a UI reflection of the backend's hard gate in attemptService.startAttempt —
// never trust this for security, it only drives what the Start button looks like.
function computeExamStatus(exam, now) {
  const startTime = new Date(exam.startTime).getTime();
  const endTime = new Date(exam.endTime).getTime();

  if (now < startTime) {
    return { key: 'upcoming', label: 'Upcoming', badgeClass: 'badge-upcoming', canStart: false };
  }
  if (now >= startTime && now <= endTime) {
    return { key: 'live', label: 'Live', badgeClass: 'badge-live', canStart: true };
  }
  return { key: 'closed', label: 'Closed', badgeClass: 'badge-closed', canStart: false };
}

function ExamCard({ exam, now, onStart }) {
  const status = computeExamStatus(exam, now);
  const startTime = new Date(exam.startTime).getTime();

  return (
    <div className="exam-card">
      <div className="exam-card-top">
        <div>
          <div className="exam-card-title">{exam.subjectCode}</div>
          <div className="exam-card-subtitle">{exam.examType}</div>
        </div>
        <span className={`badge ${status.badgeClass}`}>{status.label}</span>
      </div>

      <div className="exam-card-meta">
        <span><strong>Date:</strong> {formatDateTime(exam.examDate)}</span>
        <span><strong>Window:</strong> {formatTime(exam.startTime)} – {formatTime(exam.endTime)}</span>
        <span><strong>Duration:</strong> {exam.durationMinutes} minutes</span>
        <span><strong>Marks:</strong> {exam.maximumMarks}</span>
      </div>

      <div className="exam-card-footer">
        {status.key === 'upcoming' && (
          <div className="countdown">Starts in <strong>{formatCountdown(startTime - now)}</strong></div>
        )}
        {status.key === 'closed' && <div className="countdown">Window closed</div>}
        {status.key === 'live' && <div className="countdown">Window is open now</div>}

        <button className="btn-primary" disabled={!status.canStart} onClick={() => onStart(exam._id)}>
          Start Exam
        </button>
      </div>
    </div>
  );
}

function ResultCard({ result, onView }) {
  const exam = result.examId || {};
  return (
    <div className="exam-card">
      <div className="exam-card-top">
        <div>
          <div className="exam-card-title">{exam.subjectCode || 'Result'}</div>
          <div className="exam-card-subtitle">{exam.examType}</div>
        </div>
        <span
          className={`badge ${result.passFail === 'PASS' ? 'badge-live' : ''}`}
          style={result.passFail === 'PASS' ? undefined : { background: '#fef2f2', color: '#b91c1c' }}
        >
          {result.passFail}
        </span>
      </div>

      <div className="exam-card-meta">
        <span><strong>Marks:</strong> {result.obtainedMarks} / {result.maximumMarks}</span>
        <span><strong>Percentage:</strong> {result.percentage}%</span>
        {result.grade && <span><strong>Grade:</strong> {result.grade}</span>}
        <span><strong>Published:</strong> {result.publishedAt ? formatDateTime(result.publishedAt) : '—'}</span>
      </div>

      <div className="exam-card-footer">
        <div />
        <button className="btn-secondary" onClick={() => onView(result._id)}>View Result</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [profileRes, examsRes, resultsRes] = await Promise.all([
        getMyProfile(),
        listActiveExams(),
        listMyResults(),
      ]);
      setProfile(profileRes.data);
      setExams(examsRes.data.items || []);
      setResults(resultsRes.data || []);
    } catch (err) {
      setError(err.message || 'Could not load your dashboard');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // Re-render on an interval so a student sitting on the dashboard sees the
  // Start button unlock right at startTime without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [exams]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  function handleStart(examId) {
    navigate(`/exam/${examId}/security`);
  }

  function handleViewResult(resultId) {
    navigate(`/results/${resultId}`);
  }

  function handleLogout() {
    studentLogout();
    logout();
    navigate('/login');
  }

  return (
    <div>
      <header className="app-header">
        <span className="institution-name">
          <span className="header-mark">U</span>
          {profile?.university?.name || 'University Examination Portal'}
        </span>
        <div className="header-right">
          <button className="btn-logout" onClick={handleRefresh} disabled={refreshing || loading}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="page-container" style={{ maxWidth: 1100 }}>
        {error && <div className="error-text">{error}</div>}
        {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

        {!loading && profile && (
          <div className="exam-card-meta" style={{ marginBottom: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
            <span><strong>Name:</strong> {profile.name}</span>
            <span><strong>UID:</strong> {profile.uid}</span>
            <span><strong>Semester:</strong> {profile.semester ? profile.semester.number : '—'}</span>
            <span><strong>University:</strong> {profile.university ? profile.university.name : '—'}</span>
          </div>
        )}

        <h2>Active Examinations</h2>
        {!loading && !sortedExams.length && !error && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            There are no active examinations right now. This list only shows exams the university has
            made active — being listed here doesn&apos;t guarantee eligibility, which is checked when you
            start an exam.
          </p>
        )}
        {!loading && sortedExams.length > 0 && (
          <div className="exam-card-grid">
            {sortedExams.map((exam) => (
              <ExamCard key={exam._id} exam={exam} now={now} onStart={handleStart} />
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 36 }}>Results</h2>
        {!loading && !results.length && !error && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No results have been published yet. This section updates automatically once the university
            publishes results for an examination you took.
          </p>
        )}
        {!loading && results.length > 0 && (
          <div className="exam-card-grid">
            {results.map((result) => (
              <ResultCard key={result._id} result={result} onView={handleViewResult} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
