import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

// Blueprint -> Generate Paper -> Analyze -> Lock, per spec sections 29-33.
// A locked paper is immutable; this UI intentionally does not offer an
// "unlock" action.
export default function PapersTab() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [sections, setSections] = useState([
    { name: 'Section A', questionCount: 5, marksPerQuestion: 1 },
  ]);
  const [blueprint, setBlueprint] = useState(null);
  const [paper, setPaper] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [missing, setMissing] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const loadExams = useCallback(() => {
    adminApi.listExams().then((res) => setExams(res.data.items || [])).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  function updateSection(idx, patch) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleCreateBlueprint(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const bp = await adminApi.createBlueprint({ examId, sections });
      setBlueprint(bp.data);
      setMessage('Blueprint created.');
    } catch (err) {
      setError(err.message || 'Could not create blueprint');
    }
  }

  async function handleGenerate(mode) {
    setError(null);
    setMessage(null);
    setMissing(null);
    try {
      const res = await adminApi.generatePaper({ examId, blueprintId: blueprint._id, mode });
      setPaper(res.data);
      setMessage('Paper generated successfully.');
    } catch (err) {
      if (err.code === 'BLUEPRINT_NOT_SATISFIED') {
        setMissing(err.missing);
        setError(err.message);
      } else {
        setError(err.message || 'Could not generate paper');
      }
    }
  }

  async function handleAnalyze() {
    setError(null);
    try {
      const res = await adminApi.analyzePaper(paper._id);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.message || 'Could not analyze paper');
    }
  }

  async function handleLock() {
    if (!window.confirm('Locking this paper freezes question order, marks, and question versions. This cannot be undone. Continue?')) return;
    setError(null);
    try {
      const res = await adminApi.lockPaper(paper._id);
      setPaper(res.data);
      setMessage('Paper locked. It is now immutable.');
    } catch (err) {
      setError(err.message || 'Could not lock paper');
    }
  }

  return (
    <div>
      <h2>Blueprint &amp; Paper Generation</h2>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div className="form-field">
        <label>Examination</label>
        <select value={examId} onChange={(e) => { setExamId(e.target.value); setBlueprint(null); setPaper(null); setAnalysis(null); }}>
          <option value="">Select an exam…</option>
          {exams.map((ex) => (
            <option key={ex._id} value={ex._id}>{ex.subjectCode} — {ex.examType} ({ex.status})</option>
          ))}
        </select>
      </div>

      {examId && (
        <>
          <h3>1. Blueprint sections</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Define how many questions and marks each section contributes. Unit / topic / difficulty
            distribution percentages can be added via the API for finer control; this form covers
            the minimum required fields.
          </p>
          {sections.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="Section name" value={s.name} onChange={(e) => updateSection(idx, { name: e.target.value })} />
              <input type="number" placeholder="Question count" value={s.questionCount} onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) })} />
              <input type="number" placeholder="Marks per question" value={s.marksPerQuestion} onChange={(e) => updateSection(idx, { marksPerQuestion: Number(e.target.value) })} />
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setSections([...sections, { name: `Section ${String.fromCharCode(65 + sections.length)}`, questionCount: 5, marksPerQuestion: 1 }])}>
            + Add Section
          </button>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn-primary" onClick={handleCreateBlueprint}>Save Blueprint</button>
          </div>

          {blueprint && (
            <>
              <h3>2. Generate paper</h3>
              <button type="button" className="btn-primary" onClick={() => handleGenerate('AUTOMATIC')} style={{ marginRight: 8 }}>
                Generate Automatically
              </button>
              {missing && (
                <div className="error-text">
                  Blueprint could not be fully satisfied. Missing:
                  <ul>
                    {missing.map((m, i) => <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}

          {paper && (
            <>
              <h3>3. Review &amp; lock</h3>
              <p>Paper status: <strong>{paper.status || 'GENERATED'}</strong></p>
              <button type="button" className="btn-secondary" onClick={handleAnalyze} style={{ marginRight: 8 }}>
                Analyze Paper
              </button>
              {paper.status !== 'LOCKED' && (
                <button type="button" className="btn-primary" onClick={handleLock}>Lock Paper</button>
              )}
              {paper.status === 'LOCKED' && <span className="success-text"> Locked — immutable.</span>}

              {analysis && (
                <pre style={{ background: '#f5f6f8', padding: 12, marginTop: 10, overflowX: 'auto' }}>
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
