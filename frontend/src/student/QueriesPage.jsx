import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as examApi from '../services/examApiService';

const CATEGORIES = [
  { value: 'QUESTION', label: 'Question wording is unclear or incorrect' },
  { value: 'OPTIONS', label: 'Answer options are unclear or incorrect' },
  { value: 'TRANSLATION', label: 'Translation issue' },
  { value: 'ANSWER_SUBMISSION', label: 'My answer was not recorded correctly' },
  { value: 'TIMER', label: 'Timer issue' },
  { value: 'TECHNICAL_ISSUE', label: 'Other technical issue' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ACCEPTED: 'Accepted',
  PARTIALLY_ACCEPTED: 'Partially accepted',
  REJECTED: 'Rejected',
  RESOLVED: 'Resolved',
};

export default function QueriesPage() {
  const { attemptId } = useParams();

  const [questions, setQuestions] = useState(null);
  const [queries, setQueries] = useState([]);
  const [error, setError] = useState(null);
  const [openQuestionId, setOpenQuestionId] = useState(null);
  const [category, setCategory] = useState('QUESTION');
  const [queryText, setQueryText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const loadQueries = useCallback(() => {
    return examApi
      .listMyQueries(attemptId)
      .then((res) => setQueries(res.data || []))
      .catch((err) => setError(err.message || 'Could not load your queries'));
  }, [attemptId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [qRes] = await Promise.all([examApi.getAttemptQuestions(attemptId), loadQueries()]);
        if (cancelled) return;
        setQuestions(qRes.data.questions);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load your examination questions');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, loadQueries]);

  function queryForQuestion(questionId) {
    return queries.find((q) => q.questionId === questionId || q.questionId?._id === questionId);
  }

  function startQuery(question) {
    setOpenQuestionId(question.attemptQuestionId);
    setCategory('QUESTION');
    setQueryText('');
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(question) {
    if (!queryText.trim()) {
      setError('Please describe your query before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const optionsShown = {};
      question.options.forEach((opt) => {
        optionsShown[opt.key] = opt.text;
      });

      await examApi.submitQuery(attemptId, {
        examId: question.examId,
        questionId: question.questionId,
        questionVersionId: question.questionVersionId,
        questionTextShown: question.questionText,
        optionsShown,
        selectedOptionShown: question.selectedOption || null,
        language: 'en',
        translationVersionId: question.translationVersionId || null,
        category,
        queryText: queryText.trim(),
      });
      setMessage('Your query has been submitted.');
      setOpenQuestionId(null);
      setQueryText('');
      await loadQueries();
    } catch (err) {
      setError(err.message || 'Could not submit your query');
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !questions) {
    return (
      <div className="page-container">
        <h1>My Queries</h1>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="page-container">
        <p>Loading your examination questions…</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <h1>My Queries</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        If a question, its options, translation, or your recorded answer looked wrong, you can file a
        query per question below. Each question can only be queried once, and queries must be submitted
        before the deadline set for this examination.
      </p>

      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      {questions.map((q, idx) => {
        const existing = queryForQuestion(q.questionId);
        return (
          <div
            key={q.attemptQuestionId}
            style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <strong>Question {idx + 1}</strong>{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>({q.sectionName})</span>
                <div style={{ marginTop: 4 }}>{q.questionText}</div>
              </div>
              {existing ? (
                <span className="status-pill ok" style={{ whiteSpace: 'nowrap' }}>
                  {STATUS_LABELS[existing.status] || existing.status}
                </span>
              ) : (
                <button className="btn-secondary" type="button" onClick={() => startQuery(q)} style={{ whiteSpace: 'nowrap' }}>
                  File a Query
                </button>
              )}
            </div>

            {existing && (
              <div style={{ marginTop: 10, fontSize: '0.9rem' }}>
                <div><strong>Category:</strong> {existing.category}</div>
                <div><strong>Your query:</strong> {existing.queryText}</div>
                {existing.resolution && (
                  <div style={{ marginTop: 6 }}>
                    <strong>Resolution:</strong> {existing.resolution}
                  </div>
                )}
              </div>
            )}

            {openQuestionId === q.attemptQuestionId && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div className="form-field">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Describe your query</label>
                  <input value={queryText} onChange={(e) => setQueryText(e.target.value)} />
                </div>
                <button className="btn-primary" type="button" disabled={submitting} onClick={() => handleSubmit(q)} style={{ marginRight: 8 }}>
                  {submitting ? 'Submitting…' : 'Submit Query'}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setOpenQuestionId(null)} disabled={submitting}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ marginTop: 20 }}>
        <Link to="/dashboard">Return to Dashboard</Link>
      </p>
    </div>
  );
}
