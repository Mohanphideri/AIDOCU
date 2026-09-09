import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';
import AcademicStructureTab from './AcademicStructureTab';
import EligibilityTab from './EligibilityTab';
import PapersTab from './PapersTab';
import TranslationsTab from './TranslationsTab';
import ResultsTab from './ResultsTab';
import QueriesTab from './QueriesTab';
import AuditLogTab from './AuditLogTab';
import DashboardTab from './DashboardTab';
import StudentsTab from './StudentsTab';

const TABS = [
  'Dashboard',
  'Exams',
  'Academic Structure',
  'Eligibility',
  'Students',
  'Question Bank',
  'Faculty Submissions',
  'Blueprint & Papers',
  'Translations',
  'Results',
  'Queries',
  'Audit Log',
];

// Full exam creation requires real FK ids for the university hierarchy —
// build the exam against the subjects created in the Academic Structure
// tab, deriving the rest of the hierarchy from the chosen subject so the
// admin only has to pick one thing plus the exam-specific fields.
function ExamsTab() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    subjectId: '',
    examType: 'MID_SEM',
    academicSessionId: '',
    examDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    maximumMarks: 100,
    passingMarks: 40,
  });

  const load = useCallback(() => {
    adminApi.listExams().then((res) => setExams(res.data.items || [])).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    adminApi.listAcademic('subjects').then((res) => setSubjects(res.data || []));
    adminApi.listAcademic('semesters').then((res) => setSemesters(res.data || []));
    adminApi.listAcademic('programmes').then((res) => setProgrammes(res.data || []));
    adminApi.listAcademic('departments').then((res) => setDepartments(res.data || []));
    adminApi.listAcademic('faculties').then((res) => setFaculties(res.data || []));
    adminApi.listAcademic('sessions').then((res) => setSessions(res.data || []));
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const subject = subjects.find((s) => s._id === form.subjectId);
      if (!subject) throw new Error('Select a subject (create one under Academic Structure first)');
      const semester = semesters.find((s) => s._id === subject.semesterId || s._id === (subject.semesterId?._id));
      const programme = programmes.find((p) => p._id === subject.programmeId || p._id === (subject.programmeId?._id));
      const department = departments.find((d) => d._id === (programme?.departmentId?._id || programme?.departmentId));
      const faculty = faculties.find((f) => f._id === (department?.facultyId?._id || department?.facultyId));

      await adminApi.createExam({
        universityId: subject.universityId?._id || subject.universityId,
        academicSessionId: form.academicSessionId,
        facultyId: faculty?._id,
        departmentId: department?._id,
        programmeId: programme?._id,
        semesterId: semester?._id,
        subjectId: subject._id,
        subjectCode: subject.code,
        examType: form.examType,
        examDate: form.examDate,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: form.durationMinutes,
        maximumMarks: form.maximumMarks,
        passingMarks: form.passingMarks,
      });
      load();
    } catch (err) {
      setError(err.message || 'Could not create exam');
    }
  }

  return (
    <div>
      <h2>Examinations</h2>
      {error && <div className="error-text">{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Subject Code</th>
            <th>Type</th>
            <th>Status</th>
            <th>Result Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{exam.subjectCode}</td>
              <td>{exam.examType}</td>
              <td>{exam.status}</td>
              <td>{exam.resultStatus}</td>
              <td style={{ display: 'flex', gap: 8 }}>
                {exam.status === 'DRAFT' && (
                  <button className="btn-secondary" onClick={async () => { await adminApi.transitionExam(exam._id, 'READY'); load(); }}>
                    Mark Ready
                  </button>
                )}
                {exam.status === 'READY' && (
                  <button className="btn-secondary" onClick={async () => { await adminApi.scheduleExam(exam._id); load(); }}>
                    Schedule
                  </button>
                )}
                {exam.status === 'SCHEDULED' && (
                  <button className="btn-secondary" onClick={async () => { await adminApi.transitionExam(exam._id, 'ACTIVE'); load(); }}>
                    Activate
                  </button>
                )}
                {exam.status === 'ACTIVE' && (
                  <button className="btn-secondary" onClick={async () => { await adminApi.transitionExam(exam._id, 'CLOSED'); load(); }}>
                    Close
                  </button>
                )}
                {exam.status === 'CLOSED' && exam.resultStatus !== 'PUBLISHED' && (
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      if (window.confirm('Publishing results will make finalized results available to students and send result notification emails. Continue?')) {
                        await adminApi.publishResults(exam._id);
                        load();
                      }
                    }}
                  >
                    Publish Results
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!exams.length && (
            <tr>
              <td colSpan={5} style={{ color: 'var(--color-text-muted)' }}>No exams yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Create Exam</h3>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Subjects come from the <strong>Academic Structure</strong> tab — create the hierarchy there
        first if the list below is empty.
      </p>
      <form onSubmit={handleCreate}>
        <div className="form-field">
          <label>Subject</label>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
            <option value="">Select a subject…</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Academic Session</label>
          <select value={form.academicSessionId} onChange={(e) => setForm({ ...form, academicSessionId: e.target.value })} required>
            <option value="">Select a session…</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Exam Type</label>
          <input value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Exam Date</label>
          <input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Start Time</label>
          <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>End Time</label>
          <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
        </div>
        <div className="form-field">
          <label>Duration (minutes)</label>
          <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} required />
        </div>
        <div className="form-field">
          <label>Maximum Marks</label>
          <input type="number" value={form.maximumMarks} onChange={(e) => setForm({ ...form, maximumMarks: Number(e.target.value) })} required />
        </div>
        <div className="form-field">
          <label>Passing Marks</label>
          <input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: Number(e.target.value) })} required />
        </div>
        <button className="btn-primary" type="submit">Create Exam</button>
      </form>
    </div>
  );
}

function QuestionBankTab() {
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    subjectId: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    marks: 1,
  });

  const load = useCallback(() => {
    adminApi
      .searchQuestions()
      .then((res) => setQuestions(res.data.items || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createQuestion({
        subjectId: form.subjectId,
        questionText: form.questionText,
        options: { A: form.optionA, B: form.optionB, C: form.optionC, D: form.optionD },
        correctAnswer: form.correctAnswer,
        marks: form.marks,
      });
      load();
    } catch (err) {
      setError(err.message || 'Could not create question');
    }
  }

  return (
    <div>
      <h2>Question Bank</h2>
      {error && <div className="error-text">{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Question</th>
            <th>Status</th>
            <th>Marks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{q.questionText}</td>
              <td>{q.status}</td>
              <td>{q.marks}</td>
              <td>
                {q.status === 'DRAFT' && (
                  <button className="btn-primary" onClick={async () => { await adminApi.approveQuestion(q._id); load(); }}>
                    Approve
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!questions.length && (
            <tr>
              <td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>No questions yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Add Question</h3>
      <form onSubmit={handleCreate}>
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
        <button className="btn-primary" type="submit">Add Question</button>
      </form>
    </div>
  );
}

function FacultySubmissionsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    adminApi
      .listFacultySubmissions()
      .then((res) => setSubmissions(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2>Faculty Question Submissions</h2>
      {error && <div className="error-text">{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Question</th>
            <th>Faculty</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{s.questionText}</td>
              <td>{s.facultyMemberId?.name || '—'}</td>
              <td>{s.status}</td>
              <td>
                {['SUBMITTED', 'UNDER_REVIEW'].includes(s.status) && (
                  <>
                    <button
                      className="btn-primary"
                      style={{ marginRight: 8 }}
                      onClick={async () => {
                        await adminApi.approveFacultySubmission(s._id, { universityId: s.universityId, autoApproveInBank: true });
                        load();
                      }}
                    >
                      Approve
                    </button>
                    <button onClick={async () => { await adminApi.rejectFacultySubmission(s._id, 'Not suitable'); load(); }}>
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!submissions.length && (
            <tr>
              <td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>No submissions yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <h1>Admin — Examination Administration</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-navy)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && <DashboardTab />}
      {activeTab === 'Exams' && <ExamsTab />}
      {activeTab === 'Academic Structure' && <AcademicStructureTab />}
      {activeTab === 'Eligibility' && <EligibilityTab />}
      {activeTab === 'Students' && <StudentsTab />}
      {activeTab === 'Question Bank' && <QuestionBankTab />}
      {activeTab === 'Faculty Submissions' && <FacultySubmissionsTab />}
      {activeTab === 'Blueprint & Papers' && <PapersTab />}
      {activeTab === 'Translations' && <TranslationsTab />}
      {activeTab === 'Results' && <ResultsTab />}
      {activeTab === 'Queries' && <QueriesTab />}
      {activeTab === 'Audit Log' && <AuditLogTab />}
    </div>
  );
}
