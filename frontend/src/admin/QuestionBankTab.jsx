import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as adminApi from '../services/adminApiService';

const EMPTY_FORM = {
  subjectId: '',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  marks: 1,
  difficulty: 'MEDIUM',
  unit: '',
  topic: '',
  explanation: '',
  reference: '',
  tags: '',
};

function getId(value) {
  return value?._id || value;
}

function labelForSubject(s) {
  return `${s.code} — ${s.name}`;
}

function questionToFormState(question) {
  return {
    subjectId: getId(question.subjectId) || '',
    questionText: question.questionText || '',
    optionA: question.options?.A || '',
    optionB: question.options?.B || '',
    optionC: question.options?.C || '',
    optionD: question.options?.D || '',
    correctAnswer: question.correctAnswer || 'A',
    marks: question.marks ?? 1,
    difficulty: question.difficulty || 'MEDIUM',
    unit: question.unit || '',
    topic: question.topic || '',
    explanation: question.explanation || '',
    reference: question.reference || '',
    tags: (question.tags || []).join(', '),
  };
}

export default function QuestionBankTab({ initialSubjectId } = {}) {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('ALL');

  const [form, setForm] = useState({ ...EMPTY_FORM, subjectId: initialSubjectId || '' });
  const [editingQuestion, setEditingQuestion] = useState(null); // null = create mode
  const [changeReason, setChangeReason] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = status === 'ALL' ? {} : { status };
      if (initialSubjectId) filters.subjectId = initialSubjectId;
      const [q, s] = await Promise.all([
        adminApi.searchQuestions(filters),
        adminApi.listAcademic('subjects'),
      ]);
      setQuestions(q.data?.items || []);
      setSubjects(s.data || []);
    } catch (err) {
      setError(err.message || 'Could not load the question bank');
    } finally {
      setLoading(false);
    }
  }, [status, initialSubjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: questions.length,
      draft: questions.filter((q) => q.status === 'DRAFT').length,
      approved: questions.filter((q) => q.status === 'APPROVED').length,
      rejected: questions.filter((q) => q.status === 'REJECTED').length,
    }),
    [questions]
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingQuestion(null);
    setChangeReason('');
  }

  function startEdit(question) {
    setForm(questionToFormState(question));
    setEditingQuestion(question);
    setChangeReason('');
    setError(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPayload() {
    const subject = subjects.find((s) => s._id === form.subjectId);
    return {
      subjectId: form.subjectId,
      universityId: getId(subject?.universityId),
      questionText: form.questionText.trim(),
      options: {
        A: form.optionA.trim(),
        B: form.optionB.trim(),
        C: form.optionC.trim(),
        D: form.optionD.trim(),
      },
      correctAnswer: form.correctAnswer,
      marks: Number(form.marks),
      difficulty: form.difficulty,
      unit: form.unit || null,
      topic: form.topic || null,
      explanation: form.explanation,
      reference: form.reference,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.subjectId) {
      setError('Select a subject');
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        const payload = buildPayload();
        delete payload.subjectId; // subject cannot change on edit
        delete payload.universityId;
        await adminApi.updateQuestion(editingQuestion._id, { ...payload, changeReason });
        setMessage('Question updated.');
      } else {
        await adminApi.createQuestion(buildPayload());
        setMessage('Question saved as Draft. Approve it before using it in a paper.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Could not save question');
    } finally {
      setSaving(false);
    }
  }

  async function approve(id) {
    setError(null);
    setMessage(null);
    try {
      await adminApi.approveQuestion(id);
      setMessage('Question approved.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not approve question');
    }
  }

  async function reject(id) {
    const notes = window.prompt('Reason for rejection (optional):', 'Needs revision');
    if (notes === null) return; // cancelled
    setError(null);
    setMessage(null);
    try {
      await adminApi.rejectQuestion(id, notes);
      setMessage('Question rejected.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not reject question');
    }
  }

  function toggleImportPanel() {
    setShowImport((v) => !v);
    setImportFile(null);
    setImportPreview(null);
    setError(null);
  }

  async function handlePreviewCsv(e) {
    e.preventDefault();
    if (!importSubjectId) {
      setError('Select a subject for this import first');
      return;
    }
    if (!importFile) {
      setError('Choose a CSV or Excel file first');
      return;
    }
    setError(null);
    setPreviewing(true);
    try {
      const res = await adminApi.previewQuestionImport(importFile);
      setImportPreview(res.data);
    } catch (err) {
      setError(err.message || 'File validation failed');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!importPreview || !importPreview.validCount) return;
    const subject = subjects.find((s) => s._id === importSubjectId);
    if (!subject) return;

    setImporting(true);
    setError(null);
    try {
      const res = await adminApi.importQuestions({
        universityId: getId(subject.universityId),
        subjectId: subject._id,
        items: importPreview.valid,
        format: 'csv',
      });
      setMessage(`${res.data.createdCount} question(s) imported as Draft.`);
      setImportPreview(null);
      setImportFile(null);
      setShowImport(false);
      await load();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h2>Question Bank</h2>
      <p>Create, edit, and review questions. Draft questions are not eligible for paper generation until approved.</p>

      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['ALL', 'All questions', counts.all],
          ['DRAFT', 'Draft', counts.draft],
          ['APPROVED', 'Approved', counts.approved],
          ['REJECTED', 'Rejected', counts.rejected],
        ].map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            className={status === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setStatus(value)}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <h3>{editingQuestion ? 'Edit question' : 'Add question'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="qb-subject">Subject</label>
          <select
            id="qb-subject"
            value={form.subjectId}
            disabled={!!editingQuestion}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            required
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{labelForSubject(s)}</option>
            ))}
          </select>
          {editingQuestion && <small style={{ color: 'var(--color-text-muted)' }}>Subject cannot be changed after creation.</small>}
        </div>

        <div className="form-field">
          <label htmlFor="qb-text">Question text</label>
          <textarea
            id="qb-text"
            rows={4}
            value={form.questionText}
            onChange={(e) => setForm({ ...form, questionText: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-a">Option A</label>
            <input id="qb-a" value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} required />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-b">Option B</label>
            <input id="qb-b" value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-c">Option C</label>
            <input id="qb-c" value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} required />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-d">Option D</label>
            <input id="qb-d" value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label htmlFor="qb-correct">Correct answer</label>
            <select id="qb-correct" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label htmlFor="qb-marks">Marks</label>
            <input id="qb-marks" type="number" min="0" step="0.5" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
          </div>
          <div className="form-field" style={{ minWidth: 140 }}>
            <label htmlFor="qb-difficulty">Difficulty</label>
            <select id="qb-difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-unit">Unit</label>
            <input id="qb-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. Unit 2" />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="qb-topic">Topic</label>
            <input id="qb-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Trees" />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="qb-tags">Tags</label>
          <input id="qb-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="comma, separated, tags" />
        </div>

        <div className="form-field">
          <label htmlFor="qb-explanation">Explanation (optional)</label>
          <textarea id="qb-explanation" rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
        </div>

        <div className="form-field">
          <label htmlFor="qb-reference">Reference (optional)</label>
          <input id="qb-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>

        {editingQuestion && (
          <div className="form-field">
            <label htmlFor="qb-change-reason">Reason for change (optional, kept in version history)</label>
            <input id="qb-change-reason" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="e.g. Fixed a typo in option C" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingQuestion ? 'Save changes' : 'Save draft question'}
          </button>
          {editingQuestion && (
            <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Bulk import (CSV / Excel)</h3>
        <button type="button" className="btn-secondary" onClick={toggleImportPanel}>
          {showImport ? 'Hide import' : 'Import from CSV/Excel'}
        </button>
      </div>

      {showImport && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 16, marginTop: 8 }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            CSV or Excel (.xlsx/.xls) columns required: questionText, optionA, optionB, optionC, optionD,
            correctAnswer, marks. Optional: difficulty, unit, topic, explanation, reference, tags. Every row is
            validated before anything is imported.
          </p>

          <div className="form-field">
            <label htmlFor="qb-import-subject">Subject for this import</label>
            <select id="qb-import-subject" value={importSubjectId} onChange={(e) => setImportSubjectId(e.target.value)} required>
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{labelForSubject(s)}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handlePreviewCsv}>
            <div className="form-field">
              <label htmlFor="qb-import-file">CSV or Excel file</label>
              <input
                id="qb-import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportPreview(null);
                }}
              />
            </div>
            <button className="btn-secondary" type="submit" disabled={previewing || !importFile || !importSubjectId}>
              {previewing ? 'Validating…' : 'Validate file'}
            </button>
          </form>

          {importPreview && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                <span><strong>{importPreview.totalRows}</strong> total rows</span>
                <span className="success-text"><strong>{importPreview.validCount}</strong> valid</span>
                <span className="error-text"><strong>{importPreview.invalidCount}</strong> invalid</span>
              </div>

              {importPreview.invalidCount > 0 && (
                <ul style={{ fontSize: '0.85rem', color: 'var(--color-danger)', maxHeight: 150, overflowY: 'auto' }}>
                  {importPreview.invalid.map((row) => (
                    <li key={row.rowNumber}>Row {row.rowNumber}: {row.reason}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmImport}
                disabled={!importPreview.validCount || importing}
              >
                {importing ? 'Importing…' : `Import ${importPreview.validCount} valid question(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 28 }}>Question register</h3>
      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading questions…</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Question</th>
            <th>Subject</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>
                {q.questionText}
                <br />
                <small style={{ color: 'var(--color-text-muted)' }}>
                  {q.marks} mark{q.marks === 1 ? '' : 's'}{q.topic ? ` · ${q.topic}` : ''}
                </small>
              </td>
              <td>{q.subjectId?.code || subjects.find((s) => s._id === getId(q.subjectId))?.code || '—'}</td>
              <td>{q.difficulty}</td>
              <td>{q.status}</td>
              <td>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={() => startEdit(q)}>Edit</button>
                  {q.status === 'DRAFT' && (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => approve(q._id)}>Approve</button>
                      <button type="button" className="btn-secondary" onClick={() => reject(q._id)}>Reject</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!loading && !questions.length && (
            <tr>
              <td colSpan={5} style={{ color: 'var(--color-text-muted)' }}>
                No questions found — create your first question above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
