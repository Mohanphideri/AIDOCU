import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as adminApi from '../services/adminApiService';
import { logoutStaff } from '../services/staffAuthService';
import AcademicStructureTab from './AcademicStructureTab';
import EligibilityTab from './EligibilityTab';
import PapersTab from './PapersTab';
import TranslationsTab from './TranslationsTab';
import ResultsTab from './ResultsTab';
import QueriesTab from './QueriesTab';
import AuditLogTab from './AuditLogTab';
import DashboardTab from './DashboardTab';
import StudentsTab from './StudentsTab';
import QuestionBankTab from './QuestionBankTab';
import ExamWorkspace from './ExamWorkspace';
import { getId, labelForSubject, dateTime, EXAM_TYPES, SmartSelect } from './adminHelpers';

const NAV_GROUPS = [
  { label: 'Overview', items: [{ key: 'Dashboard', icon: '▦' }] },
  { label: 'Examination', items: [
    { key: 'Exam Workspace', icon: '★' }, { key: 'Exams', icon: '◫' }, { key: 'Eligibility', icon: '✓' },
    { key: 'Blueprint & Papers', icon: '▤' }, { key: 'Results', icon: '◉' },
  ]},
  { label: 'Academic & Content', items: [
    { key: 'Academic Structure', icon: '⌘' }, { key: 'Question Bank', icon: '?' },
    { key: 'Faculty Submissions', icon: '✦' }, { key: 'Translations', icon: '文' },
  ]},
  { label: 'People & Compliance', items: [
    { key: 'Students', icon: '♙' }, { key: 'Queries', icon: '⚑' }, { key: 'Audit Log', icon: '≡' },
  ]},
];

function ExamsTab() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId:'', academicSessionId:'', examType:'MID_SEM', examDate:'', startTime:'09:00', endTime:'10:00', durationMinutes:60, maximumMarks:100, passingMarks:40 });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [e, s, ss] = await Promise.all([adminApi.listExams(), adminApi.listAcademic('subjects'), adminApi.listAcademic('sessions')]);
      setExams(e.data?.items || []); setSubjects(s.data || []); setSessions(ss.data || []);
    } catch (err) { setError(err.message || 'Could not load examinations'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectedSubject = subjects.find(s => s._id === form.subjectId);
  const selectedSession = sessions.find(s => s._id === form.academicSessionId);
  const contextText = selectedSubject ? `${selectedSubject.code} · ${selectedSubject.name}` : 'Choose a subject to build the examination';

  async function create(e) {
    e.preventDefault(); setError(null); setMessage(null); setSaving(true);
    try {
      if (!selectedSubject) throw new Error('Select a subject');
      const payload = {
        universityId: getId(selectedSubject.universityId), academicSessionId: form.academicSessionId,
        facultyId: getId(selectedSubject.facultyId), departmentId: getId(selectedSubject.departmentId),
        programmeId: getId(selectedSubject.programmeId), semesterId: getId(selectedSubject.semesterId),
        subjectId: selectedSubject._id, subjectCode: selectedSubject.code, examType: form.examType,
        examDate: form.examDate, startTime: dateTime(form.examDate, form.startTime), endTime: dateTime(form.examDate, form.endTime),
        durationMinutes: Number(form.durationMinutes), maximumMarks: Number(form.maximumMarks), passingMarks: Number(form.passingMarks),
      };
      // Older academic endpoints return only IDs; derive missing ancestors safely.
      const ids = ['semesters','programmes','departments','faculties'];
      const [semesters, programmes, departments, faculties] = await Promise.all(ids.map(x => adminApi.listAcademic(x).then(r => r.data || [])));
      const sem = semesters.find(x => x._id === getId(selectedSubject.semesterId));
      const prog = programmes.find(x => x._id === getId(selectedSubject.programmeId));
      const dept = departments.find(x => x._id === getId(prog?.departmentId));
      const fac = faculties.find(x => x._id === getId(dept?.facultyId));
      payload.semesterId = sem?._id || payload.semesterId; payload.programmeId = prog?._id || payload.programmeId;
      payload.departmentId = dept?._id || payload.departmentId; payload.facultyId = fac?._id || payload.facultyId;
      payload.universityId = getId(selectedSubject.universityId) || getId(prog?.universityId);
      await adminApi.createExam(payload);
      setMessage('Examination created as Draft. Continue to Blueprint & Papers to build the paper.');
      setForm(f => ({...f, subjectId:'', examDate:'', startTime:'09:00', endTime:'10:00'})); await load();
    } catch (err) { setError(err.message || 'Could not create examination'); }
    finally { setSaving(false); }
  }

  async function transition(exam, target) {
    setError(null); setMessage(null);
    try { if (target === 'SCHEDULED') await adminApi.scheduleExam(exam._id); else await adminApi.transitionExam(exam._id, target); setMessage(`Exam moved to ${target}.`); await load(); }
    catch (err) { setError(err.message || 'Could not change exam status'); }
  }

  return <div className="admin-section">
    <div className="section-toolbar"><div><div className="eyebrow">Examination lifecycle</div><h2>Examinations</h2><p>Create once, then move the exam through Draft → Ready → Scheduled → Live → Closed.</p></div><button className="btn-secondary" onClick={load}>↻ Refresh</button></div>
    {error && <div className="alert alert-error">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
    <div className="admin-grid-2">
      <section className="panel"><div className="panel-head"><div><h3>Create examination</h3><span>IDs are resolved from your academic structure.</span></div><span className="step-badge">1 of 1</span></div>
        <form onSubmit={create}>
          <SmartSelect label="Subject" value={form.subjectId} onChange={e=>setForm({...form,subjectId:e.target.value})} hint={contextText}>
            <option value="">Select subject…</option>{subjects.map(s=><option key={s._id} value={s._id}>{labelForSubject(s)}</option>)}
          </SmartSelect>
          <SmartSelect label="Academic session" value={form.academicSessionId} onChange={e=>setForm({...form,academicSessionId:e.target.value})}>
            <option value="">Select session…</option>{sessions.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
          </SmartSelect>
          <div className="form-row"><SmartSelect label="Exam type" value={form.examType} onChange={e=>setForm({...form,examType:e.target.value})}><option value="">Select type…</option>{EXAM_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</SmartSelect><div className="admin-field"><label>Exam date<span className="required">*</span></label><input type="date" value={form.examDate} onChange={e=>setForm({...form,examDate:e.target.value})} required /></div></div>
          <div className="form-row"><div className="admin-field"><label>Start time<span className="required">*</span></label><input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})} required /></div><div className="admin-field"><label>End time<span className="required">*</span></label><input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})} required /></div></div>
          <div className="form-row three"><div className="admin-field"><label>Duration (min)<span className="required">*</span></label><input type="number" min="1" value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:e.target.value})} required /></div><div className="admin-field"><label>Total marks<span className="required">*</span></label><input type="number" min="1" value={form.maximumMarks} onChange={e=>setForm({...form,maximumMarks:e.target.value})} required /></div><div className="admin-field"><label>Pass marks<span className="required">*</span></label><input type="number" min="0" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:e.target.value})} required /></div></div>
          <button className="btn-primary full" disabled={saving || !subjects.length}>{saving ? 'Creating…' : 'Create draft examination'}</button>
        </form>
      </section>
      <section className="panel info-panel"><div className="panel-head"><div><h3>Before you publish</h3><span>Recommended operating flow</span></div></div><div className="workflow"><div><b>01</b><span><strong>Academic structure</strong><small>University, programme, semester and subjects</small></span></div><div><b>02</b><span><strong>Question bank</strong><small>Approve a healthy pool of questions</small></span></div><div><b>03</b><span><strong>Blueprint & paper</strong><small>Define sections and generate the paper</small></span></div><div><b>04</b><span><strong>Eligibility</strong><small>Import or select eligible students</small></span></div><div><b>05</b><span><strong>Schedule & monitor</strong><small>Lock paper, schedule and activate</small></span></div></div></section>
    </div>
    <section className="panel table-panel"><div className="panel-head"><div><h3>Examination register</h3><span>{exams.length} examination{exams.length===1?'':'s'} in this view</span></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Examination</th><th>Date</th><th>Status</th><th>Results</th><th>Action</th></tr></thead><tbody>{exams.map(ex=><tr key={ex._id}><td><strong>{ex.subjectCode}</strong><small>{ex.examType?.replaceAll('_',' ')} · {ex.durationMinutes} min</small></td><td>{ex.examDate ? new Date(ex.examDate).toLocaleDateString() : '—'}</td><td><span className={`status status-${ex.status?.toLowerCase()}`}>{ex.status}</span></td><td><span className="status status-neutral">{ex.resultStatus}</span></td><td><div className="action-row">{ex.status==='DRAFT'&&<button className="link-btn" onClick={()=>transition(ex,'READY')}>Mark ready</button>}{ex.status==='READY'&&<button className="link-btn" onClick={()=>transition(ex,'SCHEDULED')}>Schedule</button>}{ex.status==='SCHEDULED'&&<button className="link-btn" onClick={()=>transition(ex,'ACTIVE')}>Activate</button>}{ex.status==='ACTIVE'&&<button className="link-btn danger" onClick={()=>transition(ex,'CLOSED')}>Close</button>}{ex.status==='CLOSED'&&ex.resultStatus!=='PUBLISHED'&&<button className="link-btn" onClick={async()=>{try{await adminApi.publishResults(ex._id);setMessage('Results published.');load();}catch(err){setError(err.message)}}}>Publish results</button>}</div></td></tr>)}{!exams.length&&<tr><td colSpan="5"><div className="empty-state"><b>No examinations yet</b><span>Create your first draft using the form above.</span></div></td></tr>}</tbody></table></div></section>
  </div>;
}

function QuestionBankTab() {
  const [questions,setQuestions]=useState([]),[subjects,setSubjects]=useState([]),[error,setError]=useState(null),[message,setMessage]=useState(null),[saving,setSaving]=useState(false),[status,setStatus]=useState('ALL');
  const empty={subjectId:'',questionText:'',optionA:'',optionB:'',optionC:'',optionD:'',correctAnswer:'A',marks:1,difficulty:'MEDIUM',unit:'',topic:'',explanation:'',reference:'',tags:''};
  const [form,setForm]=useState(empty);
  const load=useCallback(async()=>{try{const [q,s]=await Promise.all([adminApi.searchQuestions(status==='ALL'?{}:{status}),adminApi.listAcademic('subjects')]);setQuestions(q.data?.items||[]);setSubjects(s.data||[])}catch(e){setError(e.message)}},[status]); useEffect(()=>{load()},[load]);
  const counts=useMemo(()=>({all:questions.length,draft:questions.filter(q=>q.status==='DRAFT').length,approved:questions.filter(q=>q.status==='APPROVED').length,rejected:questions.filter(q=>q.status==='REJECTED').length}),[questions]);
  async function create(e){e.preventDefault();setError(null);setMessage(null);setSaving(true);try{const s=subjects.find(x=>x._id===form.subjectId);if(!s)throw new Error('Select a subject');await adminApi.createQuestion({subjectId:s._id,universityId:getId(s.universityId),questionText:form.questionText.trim(),options:{A:form.optionA.trim(),B:form.optionB.trim(),C:form.optionC.trim(),D:form.optionD.trim()},correctAnswer:form.correctAnswer,marks:Number(form.marks),difficulty:form.difficulty,unit:form.unit||null,topic:form.topic||null,explanation:form.explanation,reference:form.reference,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean)});setForm(empty);setMessage('Question saved as Draft. Approve it before using it in a paper.');await load()}catch(e){setError(e.message||'Could not create question')}finally{setSaving(false)}}
  async function approve(id){try{await adminApi.approveQuestion(id);setMessage('Question approved.');load()}catch(e){setError(e.message)}}
  async function reject(id){const notes=window.prompt('Reason for rejection (optional):','Needs revision');if(notes===null)return;try{await adminApi.rejectQuestion(id,notes);setMessage('Question rejected.');load()}catch(e){setError(e.message)}}
  return <div className="admin-section"><div className="section-toolbar"><div><div className="eyebrow">Content management</div><h2>Question bank</h2><p>Create and review questions without entering database identifiers.</p></div><button className="btn-secondary" onClick={load}>↻ Refresh</button></div>{error&&<div className="alert alert-error">{error}</div>}{message&&<div className="alert alert-success">{message}</div>}
    <div className="metric-strip"><button className={status==='ALL'?'metric active':'metric'} onClick={()=>setStatus('ALL')}><b>{counts.all}</b><span>All questions</span></button><button className={status==='DRAFT'?'metric active':'metric'} onClick={()=>setStatus('DRAFT')}><b>{counts.draft}</b><span>Draft</span></button><button className={status==='APPROVED'?'metric active':'metric'} onClick={()=>setStatus('APPROVED')}><b>{counts.approved}</b><span>Approved</span></button><button className={status==='REJECTED'?'metric active':'metric'} onClick={()=>setStatus('REJECTED')}><b>{counts.rejected}</b><span>Rejected</span></button></div>
    <div className="admin-grid-2"><section className="panel"><div className="panel-head"><div><h3>Add question</h3><span>All ownership fields are derived automatically.</span></div></div><form onSubmit={create}><SmartSelect label="Subject" value={form.subjectId} onChange={e=>setForm({...form,subjectId:e.target.value})}><option value="">Select subject…</option>{subjects.map(s=><option key={s._id} value={s._id}>{labelForSubject(s)}</option>)}</SmartSelect><div className="admin-field"><label>Question text<span className="required">*</span></label><textarea rows="4" value={form.questionText} onChange={e=>setForm({...form,questionText:e.target.value})} required placeholder="Write the question…" /></div><div className="form-row two"><div className="admin-field"><label>Option A<span className="required">*</span></label><input value={form.optionA} onChange={e=>setForm({...form,optionA:e.target.value})} required /></div><div className="admin-field"><label>Option B<span className="required">*</span></label><input value={form.optionB} onChange={e=>setForm({...form,optionB:e.target.value})} required /></div></div><div className="form-row two"><div className="admin-field"><label>Option C<span className="required">*</span></label><input value={form.optionC} onChange={e=>setForm({...form,optionC:e.target.value})} required /></div><div className="admin-field"><label>Option D<span className="required">*</span></label><input value={form.optionD} onChange={e=>setForm({...form,optionD:e.target.value})} required /></div></div><div className="form-row three"><SmartSelect label="Correct answer" value={form.correctAnswer} onChange={e=>setForm({...form,correctAnswer:e.target.value})}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></SmartSelect><div className="admin-field"><label>Marks</label><input type="number" min="0" step="0.5" value={form.marks} onChange={e=>setForm({...form,marks:e.target.value})}/></div><SmartSelect label="Difficulty" value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>EASY</option><option>MEDIUM</option><option>HARD</option></SmartSelect></div><div className="form-row two"><div className="admin-field"><label>Unit</label><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="e.g. Unit 2"/></div><div className="admin-field"><label>Topic</label><input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="e.g. Trees"/></div></div><div className="admin-field"><label>Tags</label><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="comma, separated, tags"/></div><button className="btn-primary full" disabled={saving}>{saving?'Saving…':'Save draft question'}</button></form></section><section className="panel info-panel"><div className="panel-head"><div><h3>Question quality gate</h3><span>Keep the bank examination-ready</span></div></div><div className="check-list"><div><i>✓</i><span>Every question belongs to a selected subject</span></div><div><i>✓</i><span>Draft questions are not eligible for paper generation</span></div><div><i>✓</i><span>Approved questions can be reused across papers</span></div><div><i>✓</i><span>Difficulty, unit and topic help blueprint selection</span></div></div></section></div>
    <section className="panel table-panel"><div className="panel-head"><div><h3>Question register</h3><span>Review and approve content before paper generation.</span></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Question</th><th>Subject</th><th>Difficulty</th><th>Status</th><th>Action</th></tr></thead><tbody>{questions.map(q=><tr key={q._id}><td><strong>{q.questionText}</strong><small>{q.marks} mark{q.marks===1?'':'s'}{q.topic?` · ${q.topic}`:''}</small></td><td>{q.subjectId?.code||subjects.find(s=>s._id===getId(q.subjectId))?.code||'—'}</td><td>{q.difficulty}</td><td><span className={`status status-${q.status?.toLowerCase()}`}>{q.status}</span></td><td>{q.status==='DRAFT'&&<div className="action-row"><button className="link-btn" onClick={()=>approve(q._id)}>Approve</button><button className="link-btn danger" onClick={()=>reject(q._id)}>Reject</button></div>}</td></tr>)}{!questions.length&&<tr><td colSpan="5"><div className="empty-state"><b>No questions found</b><span>Create your first question above.</span></div></td></tr>}</tbody></table></div></section>
  </div>;
}

function FacultySubmissionsTab(){const [items,setItems]=useState([]),[error,setError]=useState(null);const load=useCallback(()=>adminApi.listFacultySubmissions().then(r=>setItems(r.data||[])).catch(e=>setError(e.message)),[]);useEffect(()=>{load()},[load]);return <div className="admin-section"><div className="section-toolbar"><div><div className="eyebrow">Faculty workflow</div><h2>Faculty submissions</h2><p>Review faculty-authored questions before they enter the approved question bank.</p></div><button className="btn-secondary" onClick={load}>↻ Refresh</button></div>{error&&<div className="alert alert-error">{error}</div>}<section className="panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Question</th><th>Faculty</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(s=><tr key={s._id}><td><strong>{s.questionText}</strong></td><td>{s.facultyMemberId?.name||'—'}</td><td><span className="status status-neutral">{s.status}</span></td><td>{['SUBMITTED','UNDER_REVIEW'].includes(s.status)&&<div className="action-row"><button className="link-btn" onClick={async()=>{try{await adminApi.approveFacultySubmission(s._id,{universityId:s.universityId,autoApproveInBank:true});load()}catch(e){setError(e.message)}}}>Approve</button><button className="link-btn danger" onClick={async()=>{try{await adminApi.rejectFacultySubmission(s._id,'Not suitable');load()}catch(e){setError(e.message)}}}>Reject</button></div>}</td></tr>)}{!items.length&&<tr><td colSpan="4"><div className="empty-state"><b>No pending submissions</b><span>Faculty questions will appear here for review.</span></div></td></tr>}</tbody></table></div></section></div>}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('Exam Workspace');
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const activeLabel = activeTab;

  function handleLogout() {
    logoutStaff();
    navigate('/admin/login');
  }

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <div className="brand-copy">
            <strong>UniExam</strong>
            <span>Administration</span>
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? '›' : '‹'}</button>
        </div>
        <div className="sidebar-scroll">
          {NAV_GROUPS.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="admin-sidebar-title">{g.label}</div>
              {g.items.map((i) => (
                <button
                  title={i.key}
                  key={i.key}
                  className={`admin-nav-item ${activeTab === i.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(i.key)}
                >
                  <span className="admin-nav-icon">{i.icon}</span>
                  <span className="nav-label">{i.key}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="avatar">A</div>
          <div className="nav-label">
            <strong>Administrator</strong>
            <span>University Admin</span>
          </div>
          <button
            className="icon-btn"
            title="Logout"
            onClick={handleLogout}
            style={{ marginLeft: 'auto' }}
          >
            ⏻
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="breadcrumb">Administration / {activeLabel}</div>
            <h1>{activeLabel}</h1>
          </div>
          <div className="top-actions">
            <span className="secure-pill">● System secure</span>
            <button className="icon-btn" title="Refresh page" onClick={() => window.location.reload()}>↻</button>
            <button className="btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <div className="admin-content">
          {activeTab === 'Dashboard' && <DashboardTab />}
          {activeTab === 'Exam Workspace' && <ExamWorkspace />}
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
      </main>
    </div>
  );
}
