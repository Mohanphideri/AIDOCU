import React, { useEffect, useState, useCallback } from 'react';
import * as facultyApi from '../services/facultyApiService';

const initialForm = {
  subjectId: '',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  marks: 1,
  unit: '',
  topic: '',
  difficulty: 'MEDIUM',
};

export default function FacultySubmissionPage() {
  const [form, setForm] = useState(initialForm);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const load = useCallback(() => {
    facultyApi
      .listMySubmissions()
      .then((res) => setSubmissions(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await facultyApi.submitQuestion({
        subjectId: form.subjectId,
        questionText: form.questionText,
        options: { A: form.optionA, B: form.optionB, C: form.optionC, D: form.optionD },
        correctAnswer: form.correctAnswer,
        marks: form.marks,
        unit: form.unit || null,
        topic: form.topic || null,
        difficulty: form.difficulty,
      });
      setForm(initialForm);
      setInfo('Question submitted for review.');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit question');
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <h1>Faculty — Submit a Question</h1>
      {info && <div className="success-banner">{info}</div>}
      {error && <div className="error-text">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Subject ID</label>
          <input value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Question Text</label>
          <input value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Option A</label>
          <input value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Option B</label>
          <input value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Option C</label>
          <input value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Option D</label>
          <input value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Correct Answer</label>
          <select value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <div className="form-field">
          <label>Marks</label>
          <input type="number" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} required />
        </div>
        <div className="form-field">
          <label>Difficulty</label>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <button className="btn-primary" type="submit">Submit for Review</button>
      </form>

      <h2 style={{ marginTop: 32 }}>My Submissions</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Question</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{s.questionText}</td>
              <td>{s.status}</td>
            </tr>
          ))}
          {!submissions.length && (
            <tr>
              <td colSpan={2} style={{ color: 'var(--color-text-muted)' }}>No submissions yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
