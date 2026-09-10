import React, { useCallback, useEffect, useState } from 'react';
import * as adminApi from '../services/adminApiService';
import { getId, labelForSubject, dateTime, EXAM_TYPES, SmartSelect } from './adminHelpers';
import QuestionBankTab from './QuestionBankTab';
import PapersTab from './PapersTab';
import EligibilityTab from './EligibilityTab';

const STEPS = [
  { key: 'details', label: '1. Exam details' },
  { key: 'questions', label: '2. Questions' },
  { key: 'blueprint', label: '3. Blueprint & Paper' },
  { key: 'eligibility', label: '4. Eligibility' },
  { key: 'activate', label: '5. Schedule & Activate' },
];

const EXAM_ID_KEY = 'admin_exam_workspace_examId';
const STEP_KEY = 'admin_exam_workspace_step';

const EMPTY_CREATE_FORM = {
  subjectId: '', academicSessionId: '', examType: 'MID_SEM', examDate: '',
  startTime: '09:00', endTime: '10:00', durationMinutes: 60, maximumMarks: 100, passingMarks: 40,
};

/**
 * The guided, sequential replacement for hopping between the separate
 * Exams / Question Bank / Blueprint & Papers / Eligibility tabs. Nothing
 * here re-implements those tools — it reuses the real QuestionBankTab,
 * PapersTab and EligibilityTab components, pre-scoped to whichever exam
 * you're working on, so it's genuinely the same data and the same actions,
 * just without having to re-select the exam/subject on every screen.
 *
 * "Auto-save": every create/save action in each step already writes to the
 * database immediately (that was already true before this component
 * existed) — what was actually getting lost was which exam and which step
 * you were on. That's what's persisted here, to localStorage, so leaving
 * and coming back drops you exactly where you left off.
 */
export default function ExamWorkspace() {
  const [examId, setExamId] = useState(() => localStorage.getItem(EXAM_ID_KEY) || '');
  const [step, setStep] = useState(() => localStorage.getItem(STEP_KEY) || 'details');

  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(false);
  const [recentExams, setRecentExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [blueprint, setBlueprint] = useState(null);
  const [eligibleCount, setEligibleCount] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (examId) localStorage.setItem(EXAM_ID_KEY, examId);
    else localStorage.removeItem(EXAM_ID_KEY);
  }, [examId]);

  useEffect(() => {
    localStorage.setItem(STEP_KEY, step);
  }, [step]);

  const loadPickerData = useCallback(() => {
    Promise.all([
      adminApi.listExams({ limit: 50 }),
      adminApi.listAcademic('subjects'),
      adminApi.listAcademic('sessions'),
    ])
      .then(([e, s, ss]) => {
        setRecentExams((e.data?.items || []).filter((x) => x.status !== 'CLOSED'));
        setSubjects(s.data || []);
        setSessions(ss.data || []);
      })
      .catch((err) => setError(err.message || 'Could not load exam picker data'));
  }, []);

  useEffect(() => {
    loadPickerData();
  }, [loadPickerData]);

  const loadExam = useCallback(async (id) => {
    if (!id) {
      setExam(null);
      return;
    }
    setExamLoading(true);
    try {
      const [examRes, blueprintRes] = await Promise.all([
        adminApi.getExam(id),
        adminApi.getBlueprintByExam(id).catch(() => ({ data: null })),
      ]);
      setExam(examRes.data);
      setBlueprint(blueprintRes.data);
      try {
        const elig = await adminApi.listEligibility(id, { limit: 1 });
        setEligibleCount(elig.data?.total ?? 0);
      } catch {
        setEligibleCount(null);
      }
    } catch (err) {
      setError(err.message || 'Could not load this exam');
    } finally {
      setExamLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExam(examId);
  }, [examId, loadExam]);

  const selectedSubject = subjects.find((s) => s._id === createForm.subjectId);
  const createContextText = selectedSubject
    ? `${selectedSubject.code} · ${selectedSubject.name}`
    : 'Choose a subject to start building the examination';

  async function handleCreateExam(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setCreating(true);
    try {
      if (!selectedSubject) throw new Error('Select a subject');

      const ids = ['semesters', 'programmes', 'departments', 'faculties'];
      const [semesters, programmes, departments, faculties] = await Promise.all(
        ids.map((x) => adminApi.listAcademic(x).then((r) => r.data || []))
      );
      const sem = semesters.find((x) => x._id === getId(selectedSubject.semesterId));
      const prog = programmes.find((x) => x._id === getId(selectedSubject.programmeId));
      const dept = departments.find((x) => x._id === getId(prog?.departmentId));
      const fac = faculties.find((x) => x._id === getId(dept?.facultyId));

      const payload = {
        universityId: getId(selectedSubject.universityId) || getId(prog?.universityId),
        academicSessionId: createForm.academicSessionId,
        facultyId: fac?._id || getId(selectedSubject.facultyId),
        departmentId: dept?._id || getId(selectedSubject.departmentId),
        programmeId: prog?._id || getId(selectedSubject.programmeId),
        semesterId: sem?._id || getId(selectedSubject.semesterId),
        subjectId: selectedSubject._id,
        subjectCode: selectedSubject.code,
        examType: createForm.examType,
        examDate: createForm.examDate,
        startTime: dateTime(createForm.examDate, createForm.startTime),
        endTime: dateTime(createForm.examDate, createForm.endTime),
        durationMinutes: Number(createForm.durationMinutes),
        maximumMarks: Number(createForm.maximumMarks),
        passingMarks: Number(createForm.passingMarks),
      };

      const res = await adminApi.createExam(payload);
      setExamId(res.data._id);
      setStep('questions');
      setMessage('Exam created as Draft. Continue below to add questions and build the paper.');
      setCreateForm(EMPTY_CREATE_FORM);
      loadPickerData();
    } catch (err) {
      setError(err.message || 'Could not create examination');
    } finally {
      setCreating(false);
    }
  }

  function startNewExam() {
    setExamId('');
    setExam(null);
    setStep('details');
    setError(null);
    setMessage(null);
  }

  async function handleTransition(target) {
    setError(null);
    setMessage(null);
    setTransitioning(true);
    try {
      if (target === 'SCHEDULED') await adminApi.scheduleExam(examId);
      else await adminApi.transitionExam(examId, target);
      setMessage(`Exam moved to ${target}.`);
      await loadExam(examId);
    } catch (err) {
      setError(err.message || 'Could not change exam status');
    } finally {
      setTransitioning(false);
    }
  }

  const canLeaveDetails = !!examId;

  return (
    <div>
      <div className="section-toolbar">
        <div>
          <div className="eyebrow">Guided workflow</div>
          <h2>Exam Workspace</h2>
          <p>Build one exam start to finish, in order — each step writes to the exam immediately, nothing is saved separately.</p>
        </div>
        {examId && (
          <button className="btn-secondary" onClick={startNewExam}>+ Start a different exam</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {STEPS.map((s, idx) => (
          <button
            key={s.key}
            type="button"
            className={step === s.key ? 'metric active' : 'metric'}
            style={{ cursor: idx === 0 || canLeaveDetails ? 'pointer' : 'not-allowed', opacity: idx === 0 || canLeaveDetails ? 1 : 0.5 }}
            disabled={idx !== 0 && !canLeaveDetails}
            onClick={() => setStep(s.key)}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span>
          </button>
        ))}
      </div>

      {examId && exam && (
        <div className="context-banner" style={{ marginBottom: 20 }}>
          <div>
            <b>{exam.subjectCode} — {exam.examType?.replaceAll('_', ' ')}</b>
            <span>
              {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : '—'} ·{' '}
              {exam.durationMinutes} min · {exam.maximumMarks} marks
            </span>
          </div>
          <strong className={`status status-${exam.status?.toLowerCase()}`} style={{ fontSize: 12 }}>{exam.status}</strong>
        </div>
      )}

      {step === 'details' && (
        <div className="admin-grid-2">
          <section className="panel">
            <div className="panel-head">
              <div><h3>Create a new exam</h3><span>IDs are resolved from your academic structure.</span></div>
            </div>
            <form onSubmit={handleCreateExam}>
              <SmartSelect label="Subject" value={createForm.subjectId} onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })} hint={createContextText}>
                <option value="">Select subject…</option>
                {subjects.map((s) => <option key={s._id} value={s._id}>{labelForSubject(s)}</option>)}
              </SmartSelect>
              <SmartSelect label="Academic session" value={createForm.academicSessionId} onChange={(e) => setCreateForm({ ...createForm, academicSessionId: e.target.value })}>
                <option value="">Select session…</option>
                {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </SmartSelect>
              <div className="form-row">
                <SmartSelect label="Exam type" value={createForm.examType} onChange={(e) => setCreateForm({ ...createForm, examType: e.target.value })}>
                  {EXAM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </SmartSelect>
                <div className="admin-field">
                  <label>Exam date<span className="required">*</span></label>
                  <input type="date" value={createForm.examDate} onChange={(e) => setCreateForm({ ...createForm, examDate: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="admin-field">
                  <label>Start time<span className="required">*</span></label>
                  <input type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} required />
                </div>
                <div className="admin-field">
                  <label>End time<span className="required">*</span></label>
                  <input type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="form-row three">
                <div className="admin-field">
                  <label>Duration (min)<span className="required">*</span></label>
                  <input type="number" min="1" value={createForm.durationMinutes} onChange={(e) => setCreateForm({ ...createForm, durationMinutes: e.target.value })} required />
                </div>
                <div className="admin-field">
                  <label>Total marks<span className="required">*</span></label>
                  <input type="number" min="1" value={createForm.maximumMarks} onChange={(e) => setCreateForm({ ...createForm, maximumMarks: e.target.value })} required />
                </div>
                <div className="admin-field">
                  <label>Pass marks<span className="required">*</span></label>
                  <input type="number" min="0" value={createForm.passingMarks} onChange={(e) => setCreateForm({ ...createForm, passingMarks: e.target.value })} required />
                </div>
              </div>
              <button className="btn-primary full" disabled={creating || !subjects.length}>
                {creating ? 'Creating…' : 'Create draft exam & continue'}
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div><h3>Continue an existing exam</h3><span>Anything not yet closed</span></div>
            </div>
            {!recentExams.length && (
              <div className="empty-state"><b>Nothing in progress</b><span>Create your first exam on the left.</span></div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentExams.map((ex) => (
                <button
                  key={ex._id}
                  type="button"
                  className="choice"
                  onClick={() => { setExamId(ex._id); setStep('questions'); }}
                >
                  <span>
                    <strong>{ex.subjectCode}</strong> — {ex.examType?.replaceAll('_', ' ')}
                    <br />
                    <small style={{ color: 'var(--color-text-muted)' }}>{ex.examDate ? new Date(ex.examDate).toLocaleDateString() : '—'}</small>
                  </span>
                  <span className={`status status-${ex.status?.toLowerCase()}`}>{ex.status}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {step === 'questions' && examId && exam && (
        <QuestionBankTab initialSubjectId={getId(exam.subjectId)} />
      )}

      {step === 'blueprint' && examId && (
        <PapersTab initialExamId={examId} />
      )}

      {step === 'eligibility' && examId && (
        <EligibilityTab initialExamId={examId} />
      )}

      {step === 'activate' && examId && exam && (
        <section className="panel">
          <div className="panel-head">
            <div><h3>Readiness checklist</h3><span>Everything below should be green before you activate.</span></div>
          </div>
          <div className="check-list" style={{ marginBottom: 20 }}>
            <div>
              <i>{blueprint ? '✓' : '•'}</i>
              <span>{blueprint ? 'Blueprint created' : 'No blueprint yet — go to step 3'}</span>
            </div>
            <div>
              <i>{exam.lockedPaperId ? '✓' : '•'}</i>
              <span>{exam.lockedPaperId ? 'Paper generated and locked' : 'Paper not locked yet — go to step 3'}</span>
            </div>
            <div>
              <i>{eligibleCount ? '✓' : '•'}</i>
              <span>{eligibleCount ? `${eligibleCount} eligible student(s)` : 'No eligible students yet — go to step 4'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {exam.status === 'DRAFT' && (
              <button className="btn-primary" disabled={transitioning} onClick={() => handleTransition('READY')}>Mark ready</button>
            )}
            {exam.status === 'READY' && (
              <button className="btn-primary" disabled={transitioning || !exam.lockedPaperId} onClick={() => handleTransition('SCHEDULED')}>
                {exam.lockedPaperId ? 'Schedule' : 'Lock the paper first (step 3)'}
              </button>
            )}
            {exam.status === 'SCHEDULED' && (
              <button className="btn-primary" disabled={transitioning} onClick={() => handleTransition('ACTIVE')}>
                Activate — notify eligible students now
              </button>
            )}
            {exam.status === 'ACTIVE' && (
              <button className="btn-secondary" disabled={transitioning} onClick={() => handleTransition('CLOSED')}>Close exam</button>
            )}
            {exam.status === 'CLOSED' && <span style={{ color: 'var(--color-text-muted)' }}>This exam is closed.</span>}
          </div>
          {exam.status === 'SCHEDULED' && (
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Activating sends every eligible student an email with a direct link into this exam — nothing is
              emailed before this point.
            </p>
          )}
        </section>
      )}

      {examLoading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
    </div>
  );
}
