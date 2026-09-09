import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as examApi from '../services/examApiService';

const STATUS_POLL_MS = 15000;
const TICK_MS = 1000;

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function questionNavClass(q, isCurrent) {
  const classes = ['exam-nav-btn'];
  if (isCurrent) classes.push('current');
  else if (q.selectedOption && q.markedForReview) classes.push('answered-marked');
  else if (q.selectedOption) classes.push('answered');
  else if (q.markedForReview) classes.push('marked');
  else if (q.visited) classes.push('visited');
  return classes.join(' ');
}

export default function ExamPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState(null);
  const [language, setLanguage] = useState('en');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(null);
  const [attemptStatus, setAttemptStatus] = useState('ACTIVE');
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const finishedRef = useRef(false); // guards against double auto-submit
  const questionsRef = useRef(null);
  questionsRef.current = questions;

  // ---- Initial load ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [qRes, statusRes] = await Promise.all([
          examApi.getAttemptQuestions(attemptId),
          examApi.getAttemptStatus(attemptId),
        ]);
        if (cancelled) return;
        setQuestions(qRes.data.questions);
        setLanguage(qRes.data.language);
        setRemainingMs(statusRes.data.remainingMs);
        setAttemptStatus(statusRes.data.status);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load examination');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const doSubmit = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    try {
      await examApi.submitAttempt(attemptId);
    } catch (err) {
      // Even on error, don't leave the student stuck on a dead exam screen —
      // most failure modes here mean the attempt was already finalized
      // server-side (e.g. by a fullscreen auto-submit that just landed).
    } finally {
      navigate('/exam/submitted', { state: { attemptId } });
    }
  }, [attemptId, navigate]);

  // ---- Local countdown tick + periodic server resync ----
  useEffect(() => {
    if (remainingMs === null) return undefined;

    const tick = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev === null) return prev;
        const next = prev - TICK_MS;
        if (next <= 0 && !finishedRef.current) {
          doSubmit();
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    const resync = setInterval(async () => {
      try {
        const res = await examApi.getAttemptStatus(attemptId);
        setRemainingMs(res.data.remainingMs);
        setAttemptStatus(res.data.status);
        if (res.data.status !== 'ACTIVE' && !finishedRef.current) {
          finishedRef.current = true;
          navigate('/exam/submitted', { state: { attemptId } });
        }
      } catch (err) {
        // Transient network issue — keep the cosmetic local countdown
        // running; server state wins again on the next successful resync.
      }
    }, STATUS_POLL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(resync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, doSubmit, remainingMs === null]);

  // ---- Fullscreen + tab-switch proctoring signals ----
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement && attemptStatus === 'ACTIVE' && !finishedRef.current) {
        examApi.recordProctoringEvent(attemptId, null, 'FULLSCREEN_EXIT').then((res) => {
          const count = res?.data?.fullscreenViolationCount ?? 0;
          const status = res?.data?.attemptStatus;
          if (status && status !== 'ACTIVE') {
            finishedRef.current = true;
            navigate('/exam/submitted', { state: { attemptId } });
            return;
          }
          if (count === 1) setWarning('You have exited fullscreen mode. This is your first warning.');
          else if (count === 2) setWarning('You have exited fullscreen mode again. This is your final warning — one more exit will submit your examination automatically.');
        });
      }
    }

    function onVisibilityChange() {
      if (document.hidden && attemptStatus === 'ACTIVE') {
        examApi.recordProctoringEvent(attemptId, null, 'TAB_SWITCH');
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [attemptId, attemptStatus, navigate]);

  async function reenterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setWarning(null);
    } catch (err) {
      // Browser may require a direct user gesture — the button click above
      // provides that, so this should normally succeed.
    }
  }

  function updateQuestionLocal(attemptQuestionId, patch) {
    setQuestions((prev) => prev.map((q) => (q.attemptQuestionId === attemptQuestionId ? { ...q, ...patch } : q)));
  }

  async function handleSelectOption(optionKey) {
    const q = questions[currentIndex];
    updateQuestionLocal(q.attemptQuestionId, { selectedOption: optionKey });
    try {
      await examApi.saveAnswer(attemptId, q.attemptQuestionId, optionKey);
    } catch (err) {
      setError('Could not save your answer. Please check your connection.');
    }
  }

  async function handleToggleMarkForReview() {
    const q = questions[currentIndex];
    const nextValue = !q.markedForReview;
    updateQuestionLocal(q.attemptQuestionId, { markedForReview: nextValue, visited: true });
    try {
      await examApi.markForReview(attemptId, q.attemptQuestionId, nextValue);
    } catch (err) {
      // Non-critical UI state — safe to ignore transient failures here.
    }
  }

  function goTo(index) {
    if (index < 0 || index >= questions.length) return;
    const q = questions[index];
    if (!q.visited) {
      updateQuestionLocal(q.attemptQuestionId, { visited: true });
      examApi.markForReview(attemptId, q.attemptQuestionId, q.markedForReview).catch(() => {});
    }
    setCurrentIndex(index);
  }

  if (error && !questions) {
    return (
      <div className="page-container">
        <h1>Unable to load examination</h1>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="page-container">
        <p>Loading your examination…</p>
      </div>
    );
  }

  const current = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.selectedOption).length;
  const markedCount = questions.filter((q) => q.markedForReview).length;
  const unansweredCount = questions.length - answeredCount;
  const lowTime = remainingMs !== null && remainingMs < 5 * 60 * 1000;

  return (
    <div className="exam-shell">
      <header className="exam-header">
        <div className="exam-header-info">
          <span>
            <strong>Question</strong>
            {currentIndex + 1} of {questions.length}
          </span>
          <span>
            <strong>Section</strong>
            {current.sectionName}
          </span>
          <span>
            <strong>Language</strong>
            <select
              value={language}
              onChange={async (e) => {
                const lang = e.target.value;
                setLanguage(lang);
                try {
                  await examApi.changeLanguage(attemptId, lang);
                  const res = await examApi.getAttemptQuestions(attemptId);
                  setQuestions(res.data.questions);
                } catch (err) {
                  setError('Could not change language');
                }
              }}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4 }}
            >
              <option value="en" style={{ color: '#000' }}>English</option>
              <option value="hi" style={{ color: '#000' }}>हिन्दी</option>
              <option value="pa" style={{ color: '#000' }}>ਪੰਜਾਬੀ</option>
              <option value="ta" style={{ color: '#000' }}>தமிழ்</option>
            </select>
          </span>
        </div>
        <div className={`exam-timer ${lowTime ? 'exam-timer-low' : ''}`}>{formatDuration(remainingMs || 0)}</div>
      </header>

      {warning && (
        <div className="warning-banner" style={{ margin: '12px 20px 0' }}>
          {warning}{' '}
          {!document.fullscreenElement && (
            <button className="btn-warning" type="button" onClick={reenterFullscreen} style={{ marginLeft: 12 }}>
              Return to Fullscreen
            </button>
          )}
        </div>
      )}
      {error && <div className="error-text" style={{ margin: '12px 20px 0' }}>{error}</div>}

      <div className="exam-body">
        <div className="exam-question-panel">
          <div className="exam-question-meta">
            <span>Marks: {current.marks}</span>
            <span>{current.markedForReview ? 'Marked for review' : ''}</span>
          </div>
          <div className="exam-question-text">{current.questionText}</div>

          {current.options.map((opt) => (
            <label
              key={opt.key}
              className={`exam-option ${current.selectedOption === opt.key ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name={`q-${current.attemptQuestionId}`}
                checked={current.selectedOption === opt.key}
                onChange={() => handleSelectOption(opt.key)}
              />
              <span>{opt.text}</span>
            </label>
          ))}

          <div className="exam-question-nav-buttons">
            <div>
              <button className="btn-secondary" type="button" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
                Previous
              </button>
              <button className="btn-warning" type="button" onClick={handleToggleMarkForReview} style={{ marginLeft: 10 }}>
                {current.markedForReview ? 'Unmark Review' : 'Mark for Review'}
              </button>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
            >
              Next
            </button>
          </div>
        </div>

        <aside className="exam-navigator">
          <h3>Question Navigator</h3>
          <div className="exam-navigator-legend">
            <span><span className="legend-dot" style={{ background: 'var(--color-success)' }} /> Answered</span>
            <span><span className="legend-dot" style={{ background: 'var(--color-gold)' }} /> Marked for review</span>
            <span><span className="legend-dot" style={{ background: '#eef1f7' }} /> Visited, unanswered</span>
            <span><span className="legend-dot" style={{ background: '#fff', border: '1px solid var(--color-border)' }} /> Not visited</span>
          </div>
          <div className="exam-navigator-grid">
            {questions.map((q, idx) => (
              <button
                key={q.attemptQuestionId}
                type="button"
                className={questionNavClass(q, idx === currentIndex)}
                onClick={() => goTo(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <button className="btn-primary exam-submit-btn" type="button" onClick={() => setShowConfirm(true)}>
            Submit Examination
          </button>
        </aside>
      </div>

      {showConfirm && (
        <div className="exam-modal-backdrop">
          <div className="exam-modal">
            <h2>Submit Examination?</h2>
            <p>Once submitted, you will not be able to change your answers.</p>
            <div className="exam-modal-stats">
              <div><strong>{answeredCount}</strong>Answered</div>
              <div><strong>{unansweredCount}</strong>Unanswered</div>
              <div><strong>{markedCount}</strong>Marked</div>
            </div>
            <p>Are you sure you want to submit your examination?</p>
            <div className="exam-modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setShowConfirm(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={doSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
