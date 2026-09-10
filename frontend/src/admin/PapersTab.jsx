import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';
import QuestionPicker from './QuestionPicker';
import PaperPreview from './PaperPreview';

const MODES = [
  { value: 'AUTOMATIC', label: 'Automatic', help: 'Questions are picked automatically to satisfy the blueprint.' },
  { value: 'MANUAL', label: 'Manual', help: 'You pick every question for every section yourself.' },
  { value: 'HYBRID', label: 'Hybrid', help: 'You pick some questions per section; the rest are filled automatically.' },
];

const DEFAULT_SECTIONS = [{ name: 'Section A', questionCount: 5, marksPerQuestion: 1 }];

// Blueprint -> Generate Paper (Automatic/Manual/Hybrid) -> Edit -> Preview -> Analyze -> Lock.
// A locked paper is immutable; this UI intentionally does not offer an "unlock" action.
export default function PapersTab({ initialExamId } = {}) {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(initialExamId || '');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintLocked, setBlueprintLocked] = useState(false);
  const [savingBlueprint, setSavingBlueprint] = useState(false);
  const [mode, setMode] = useState('AUTOMATIC');
  const [manualSelections, setManualSelections] = useState({});

  const [paper, setPaper] = useState(null);
  const [examQuestions, setExamQuestions] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [missing, setMissing] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAdder, setShowAdder] = useState(null); // sectionName currently adding into
  const [adderSelection, setAdderSelection] = useState([]);

  const selectedExam = exams.find((ex) => ex._id === examId);

  const loadExams = useCallback(() => {
    adminApi.listExams().then((res) => setExams(res.data.items || [])).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (initialExamId) resetForNewExam(initialExamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExamId]);

  function resetForNewExam(id) {
    setExamId(id);
    setBlueprint(null);
    setBlueprintLocked(false);
    setSections(DEFAULT_SECTIONS);
    setPaper(null);
    setExamQuestions(null);
    setAnalysis(null);
    setMissing(null);
    setManualSelections({});
    setShowPreview(false);
    setError(null);
    setMessage(null);
    if (id) loadBlueprintForExam(id);
  }

  async function loadBlueprintForExam(id) {
    setBlueprintLoading(true);
    try {
      const res = await adminApi.getBlueprintByExam(id);
      if (res.data) {
        setBlueprint(res.data);
        setSections(res.data.sections);

        const lockedPapers = await adminApi.listPapers({ blueprintId: res.data._id, status: 'LOCKED' });
        setBlueprintLocked((lockedPapers.data.items || []).length > 0);
      } else {
        setBlueprint(null);
        setSections(DEFAULT_SECTIONS);
        setBlueprintLocked(false);
      }
    } catch (err) {
      setError(err.message || 'Could not load the blueprint for this exam');
    } finally {
      setBlueprintLoading(false);
    }
  }

  function updateSection(idx, patch) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleSaveBlueprint(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSavingBlueprint(true);
    try {
      if (blueprint && blueprint._id) {
        const res = await adminApi.updateBlueprint(blueprint._id, sections);
        setBlueprint(res.data);
        setMessage('Blueprint updated.');
      } else {
        const res = await adminApi.createBlueprint({ examId, sections });
        setBlueprint(res.data);
        setMessage('Blueprint created.');
      }
    } catch (err) {
      if (err.code === 'BLUEPRINT_LOCKED') {
        setBlueprintLocked(true);
      }
      setError(err.message || 'Could not save blueprint');
    } finally {
      setSavingBlueprint(false);
    }
  }

  function toggleManualQuestion(sectionName, questionId) {
    setManualSelections((prev) => {
      const current = prev[sectionName] || [];
      const next = current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId];
      return { ...prev, [sectionName]: next };
    });
  }

  async function loadPreview(paperId) {
    const res = await adminApi.previewPaper(paperId);
    setExamQuestions(res.data);
  }

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    setMissing(null);
    try {
      const payload = { examId, blueprintId: blueprint._id, mode };
      if (mode !== 'AUTOMATIC') payload.manualSelections = manualSelections;

      const res = await adminApi.generatePaper(payload);
      setPaper(res.data);
      setMessage('Paper generated successfully.');
      await loadPreview(res.data._id);
    } catch (err) {
      if (err.code === 'BLUEPRINT_NOT_SATISFIED') {
        setMissing(err.missing);
        setError(err.message);
      } else {
        setError(err.message || 'Could not generate paper');
      }
    }
  }

  async function handleRemoveQuestion(examQuestionId) {
    if (!window.confirm('Remove this question from the paper?')) return;
    setError(null);
    setMessage(null);
    try {
      const updated = await adminApi.editPaper(paper._id, { removeExamQuestionIds: [examQuestionId] });
      setPaper(updated.data);
      await loadPreview(paper._id);
      setMessage('Question removed.');
    } catch (err) {
      setError(err.message || 'Could not remove question');
    }
  }

  async function handleMove(examQuestionId, direction) {
    const idx = examQuestions.findIndex((eq) => eq._id === examQuestionId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= examQuestions.length) return;

    const reordered = [...examQuestions];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    setError(null);
    try {
      const reorder = reordered.map((eq, i) => ({ examQuestionId: eq._id, orderIndex: i }));
      const updated = await adminApi.editPaper(paper._id, { reorder });
      setPaper(updated.data);
      await loadPreview(paper._id);
    } catch (err) {
      setError(err.message || 'Could not reorder questions');
    }
  }

  function openAdder(sectionName) {
    setShowAdder(sectionName);
    setAdderSelection([]);
  }

  async function handleAddQuestions() {
    if (!adderSelection.length) {
      setShowAdder(null);
      return;
    }
    setError(null);
    try {
      const updated = await adminApi.editPaper(paper._id, {
        addQuestionIds: adderSelection,
        targetSectionName: showAdder,
        marksPerQuestion: sections.find((s) => s.name === showAdder)?.marksPerQuestion || 1,
      });
      setPaper(updated.data);
      await loadPreview(paper._id);
      setMessage('Questions added.');
      setShowAdder(null);
      setAdderSelection([]);
    } catch (err) {
      setError(err.message || 'Could not add questions');
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

  const existingQuestionIds = (examQuestions || []).map((eq) => eq.questionId?._id || eq.questionId).filter(Boolean);

  return (
    <div>
      <h2>Blueprint &amp; Paper Generation</h2>
      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div className="form-field">
        <label>Examination</label>
        <select value={examId} onChange={(e) => resetForNewExam(e.target.value)}>
          <option value="">Select an exam…</option>
          {exams.map((ex) => (
            <option key={ex._id} value={ex._id}>{ex.subjectCode} — {ex.examType} ({ex.status})</option>
          ))}
        </select>
      </div>

      {examId && (
        <>
          <h3>1. Blueprint sections {blueprint && <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>(editing existing blueprint)</span>}</h3>
          {blueprintLoading && <p style={{ color: 'var(--color-text-muted)' }}>Loading blueprint…</p>}
          {blueprintLocked && (
            <div className="warning-banner">
              This blueprint is locked to a generated, locked paper and can no longer be edited.
            </div>
          )}
          <p style={{ color: 'var(--color-text-muted)' }}>
            Define how many questions and marks each section contributes. Unit / topic / difficulty
            distribution percentages can be added via the API for finer control; this form covers
            the minimum required fields.
          </p>
          {sections.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="Section name" value={s.name} disabled={blueprintLocked} onChange={(e) => updateSection(idx, { name: e.target.value })} />
              <input type="number" placeholder="Question count" value={s.questionCount} disabled={blueprintLocked} onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) })} />
              <input type="number" placeholder="Marks per question" value={s.marksPerQuestion} disabled={blueprintLocked} onChange={(e) => updateSection(idx, { marksPerQuestion: Number(e.target.value) })} />
            </div>
          ))}
          <button type="button" className="btn-secondary" disabled={blueprintLocked} onClick={() => setSections([...sections, { name: `Section ${String.fromCharCode(65 + sections.length)}`, questionCount: 5, marksPerQuestion: 1 }])}>
            + Add Section
          </button>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn-primary" disabled={blueprintLocked || savingBlueprint} onClick={handleSaveBlueprint}>
              {savingBlueprint ? 'Saving…' : blueprint ? 'Update Blueprint' : 'Save Blueprint'}
            </button>
          </div>

          {blueprint && !paper && !blueprintLocked && (
            <>
              <h3>2. Generate paper</h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {MODES.map((m) => (
                  <label key={m.value} style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: 10, cursor: 'pointer', background: mode === m.value ? 'var(--color-surface-active, #eef3ff)' : 'transparent' }}>
                    <div>
                      <input type="radio" name="mode" checked={mode === m.value} onChange={() => setMode(m.value)} style={{ marginRight: 6 }} />
                      <strong>{m.label}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{m.help}</div>
                  </label>
                ))}
              </div>

              {mode !== 'AUTOMATIC' && selectedExam && (
                <div style={{ marginBottom: 14 }}>
                  {blueprint.sections.map((section) => (
                    <div key={section.name} style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        {section.name} — need {section.questionCount} question(s)
                        {' '}
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                          ({(manualSelections[section.name] || []).length} selected manually
                          {mode === 'HYBRID' ? ', rest filled automatically' : ''})
                        </span>
                      </div>
                      <QuestionPicker
                        subjectId={selectedExam.subjectId}
                        selectedIds={manualSelections[section.name] || []}
                        onToggle={(qid) => toggleManualQuestion(section.name, qid)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="btn-primary" onClick={handleGenerate}>
                Generate Paper
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
              <h3>3. Review, edit &amp; lock</h3>
              <p>
                Paper status: <strong>{paper.status}</strong>
                {' · '}{paper.totalQuestions} question(s), {paper.totalMarks} mark(s)
              </p>

              {paper.status !== 'LOCKED' && examQuestions && (
                <div style={{ marginBottom: 18 }}>
                  <h4>Editor</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Remove a question, reorder within the paper, or add more from the question bank. Each change re-marks the paper "In Review" until you lock it.
                  </p>
                  {[...new Set(examQuestions.map((eq) => eq.sectionName))].map((sectionName) => (
                    <div key={sectionName} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{sectionName}</strong>
                        <button type="button" className="btn-secondary" onClick={() => openAdder(sectionName)}>+ Add question</button>
                      </div>
                      {examQuestions.filter((eq) => eq.sectionName === sectionName).map((eq, idx, arr) => (
                        <div key={eq._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ flex: 1, fontSize: '0.9rem' }}>
                            {eq.orderIndex + 1}. {eq.questionVersionId?.questionText} <span style={{ color: 'var(--color-text-muted)' }}>[{eq.marks} mark(s)]</span>
                          </div>
                          <button type="button" className="btn-secondary" disabled={idx === 0} onClick={() => handleMove(eq._id, -1)}>↑</button>
                          <button type="button" className="btn-secondary" disabled={idx === arr.length - 1} onClick={() => handleMove(eq._id, 1)}>↓</button>
                          <button type="button" className="btn-secondary" onClick={() => handleRemoveQuestion(eq._id)}>Remove</button>
                        </div>
                      ))}
                      {showAdder === sectionName && selectedExam && (
                        <div style={{ marginTop: 8 }}>
                          <QuestionPicker
                            subjectId={selectedExam.subjectId}
                            selectedIds={adderSelection}
                            excludeQuestionIds={existingQuestionIds}
                            onToggle={(qid) => setAdderSelection((prev) => (prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]))}
                          />
                          <div style={{ marginTop: 8 }}>
                            <button type="button" className="btn-primary" onClick={handleAddQuestions} style={{ marginRight: 8 }}>Add Selected</button>
                            <button type="button" className="btn-secondary" onClick={() => setShowAdder(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="btn-secondary" onClick={handleAnalyze} style={{ marginRight: 8 }}>
                Analyze Paper
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowPreview((v) => !v)} style={{ marginRight: 8 }}>
                {showPreview ? 'Hide Preview' : 'Formal Preview'}
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

              {showPreview && examQuestions && (
                <div style={{ marginTop: 14 }}>
                  <PaperPreview exam={selectedExam} examQuestions={examQuestions} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
