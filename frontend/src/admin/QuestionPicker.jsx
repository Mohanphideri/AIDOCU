import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

/**
 * Search + checkbox picker over the approved question bank, scoped to a
 * single subject. Used both for manual/hybrid section selection at
 * generation time and for adding questions to an already-generated paper.
 */
export default function QuestionPicker({ subjectId, selectedIds, onToggle, excludeQuestionIds = [] }) {
  const [unit, setUnit] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { subjectId, status: 'APPROVED', limit: 50 };
    if (unit.trim()) params.unit = unit.trim();
    if (topic.trim()) params.topic = topic.trim();
    if (difficulty) params.difficulty = difficulty;

    adminApi
      .searchQuestions(params)
      .then((res) => setResults(res.data.items || []))
      .catch((err) => setError(err.message || 'Could not search questions'))
      .finally(() => setLoading(false));
  }, [subjectId, unit, topic, difficulty]);

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const excludeSet = new Set(excludeQuestionIds.map(String));
  const visibleResults = results.filter((q) => !excludeSet.has(String(q._id)));

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ maxWidth: 140 }} />
        <input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} style={{ maxWidth: 140 }} />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="button" className="btn-secondary" onClick={search}>Search</button>
      </div>

      {error && <div className="error-text">{error}</div>}
      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Searching…</p>}

      {!loading && (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {visibleResults.map((q) => (
            <label key={q._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(q._id)}
                onChange={() => onToggle(q._id)}
                style={{ marginTop: 4 }}
              />
              <span style={{ fontSize: '0.9rem' }}>
                <strong>[{q.unit || '—'} / {q.difficulty}]</strong> {q.questionText}
              </span>
            </label>
          ))}
          {!visibleResults.length && <p style={{ color: 'var(--color-text-muted)' }}>No matching approved questions.</p>}
        </div>
      )}
    </div>
  );
}
