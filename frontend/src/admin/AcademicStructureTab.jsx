import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

const LEVELS = [
  { key: 'universities', label: 'University', icon: 'U', fields: [['name', 'University name', 'text'], ['officialEmail', 'Official email', 'email'], ['emailDomain', 'Student email domain', 'text'], ['address', 'Address', 'text'], ['contactNumber', 'Contact number', 'text']] },
  { key: 'sessions', label: 'Academic session', icon: 'S', parent: 'universities', parentField: 'universityId', fields: [['name', 'Session name', 'text'], ['startDate', 'Start date', 'date'], ['endDate', 'End date', 'date']] },
  { key: 'faculties', label: 'Faculty / School', icon: 'F', parent: 'universities', parentField: 'universityId', fields: [['name', 'Faculty name', 'text'], ['code', 'Code', 'text']] },
  { key: 'departments', label: 'Department', icon: 'D', parent: 'faculties', parentField: 'facultyId', fields: [['name', 'Department name', 'text'], ['code', 'Code', 'text']] },
  { key: 'programmes', label: 'Programme', icon: 'P', parent: 'departments', parentField: 'departmentId', fields: [['name', 'Programme name', 'text'], ['code', 'Programme code', 'text'], ['durationSemesters', 'Duration (semesters)', 'number']] },
  { key: 'semesters', label: 'Semester', icon: '2', parent: 'programmes', parentField: 'programmeId', needsSession: true, fields: [['number', 'Semester number', 'number']] },
  { key: 'subjects', label: 'Subject', icon: 'C', parent: 'semesters', parentField: 'semesterId', needsProgramme: true, fields: [['name', 'Subject name', 'text'], ['code', 'Subject code', 'text']] },
];

function id(x) { return x?._id || x; }
function display(item, key) {
  if (key === 'semesters') return `Semester ${item.number}`;
  return item.code ? `${item.code} — ${item.name}` : item.name;
}

export default function AcademicStructureTab() {
  const [data, setData] = useState({});
  const [sel, setSel] = useState({});
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { key, id, values }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await Promise.all(LEVELS.map((l) => adminApi.listAcademic(l.key).then((r) => [l.key, r.data || []])));
      setData(Object.fromEntries(rows));
    } catch (e) {
      setError(e.message || 'Could not load academic structure');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function select(key, value) {
    const idx = LEVELS.findIndex((x) => x.key === key);
    const next = { ...sel, [key]: value };
    LEVELS.slice(idx + 1).forEach((x) => delete next[x.key]);
    setSel(next);
  }

  const currentUniversity = sel.universities;
  const selectedPath = LEVELS.filter((x) => sel[x.key]).map((x) => {
    const item = (data[x.key] || []).find((y) => y._id === sel[x.key]);
    return item ? display(item, x.key) : '';
  }).filter(Boolean);

  function filtered(l) {
    const items = data[l.key] || [];
    if (!l.parent) return items;
    if (!sel[l.parent]) return [];
    return items.filter((item) => id(item[l.parentField]) === sel[l.parent]);
  }

  async function create(e, l) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      const payload = { ...form };
      if (l.parent) payload[l.parentField] = sel[l.parent];
      if (l.key !== 'universities') payload.universityId = currentUniversity;
      if (l.needsSession) payload.academicSessionId = sel.sessions;
      if (l.needsProgramme) payload.programmeId = sel.programmes;
      await adminApi.createAcademic(l.key, payload);
      setForm({});
      setMsg(`${l.label} created successfully.`);
      await load();
    } catch (e) {
      setError(e.message || `Could not create ${l.label}`);
    }
  }

  function startEdit(l, item) {
    setError(null);
    setMsg(null);
    const values = {};
    l.fields.forEach(([name]) => { values[name] = item[name] ?? ''; });
    setEditing({ key: l.key, id: item._id, values });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit(l) {
    if (!editing || editing.key !== l.key) return;
    setBusyId(editing.id);
    setError(null);
    setMsg(null);
    try {
      await adminApi.updateAcademic(l.key, editing.id, editing.values);
      setMsg(`${l.label} updated successfully.`);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || `Could not update ${l.label}`);
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateItem(l, item) {
    const label = display(item, l.key) || l.label;
    if (!window.confirm(`Deactivate ${label}? This won't delete existing records, but the ${l.label.toLowerCase()} will no longer be usable for new records.`)) {
      return;
    }
    setBusyId(item._id);
    setError(null);
    setMsg(null);
    try {
      await adminApi.deactivateAcademic(l.key, item._id);
      setMsg(`${l.label} deactivated.`);
      if (sel[l.key] === item._id) select(l.key, undefined);
      await load();
    } catch (e) {
      setError(e.message || `Could not deactivate ${l.label}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-section">
      <div className="section-toolbar">
        <div>
          <div className="eyebrow">Academic master data</div>
          <h2>Academic structure</h2>
          <p>Set up the hierarchy once. Every exam, question and student workflow reuses these records.</p>
        </div>
        <button className="btn-secondary" onClick={load}>↻ Refresh</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="structure-path">
        <span>Current path</span>
        <b>{selectedPath.length ? selectedPath.join('  /  ') : 'Select a university to begin'}</b>
      </div>

      <div className="structure-layout">
        <div className="structure-steps">
          {LEVELS.map((l, idx) => {
            const parentReady = !l.parent || sel[l.parent];
            const items = filtered(l);
            return (
              <section className={`structure-step ${sel[l.key] ? 'selected' : ''} ${!parentReady ? 'disabled' : ''}`} key={l.key}>
                <div className="step-title">
                  <span className="step-number">{idx + 1}</span>
                  <div><h3>{l.label}</h3><small>{items.length} available</small></div>
                </div>

                {parentReady && (
                  <div className="choice-list" style={{ gridTemplateColumns: '1fr' }}>
                    {items.map((item) => (
                      <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {editing && editing.key === l.key && editing.id === item._id ? (
                          <form
                            className="inline-create"
                            style={{ flex: 1, borderTop: 'none', paddingTop: 0 }}
                            onSubmit={(e) => { e.preventDefault(); saveEdit(l); }}
                          >
                            {l.fields.map(([name, label, type]) => (
                              <div className="admin-field compact" key={name}>
                                <label>{label}</label>
                                <input
                                  type={type}
                                  value={editing.values[name] ?? ''}
                                  required={name !== 'address' && name !== 'contactNumber'}
                                  onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [name]: e.target.value } })}
                                />
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-primary" type="submit" disabled={busyId === item._id}>
                                {busyId === item._id ? 'Saving…' : 'Save'}
                              </button>
                              <button className="btn-secondary" type="button" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <button
                              className={sel[l.key] === item._id ? 'choice active' : 'choice'}
                              style={{ flex: 1 }}
                              onClick={() => select(l.key, item._id)}
                            >
                              {display(item, l.key)}
                              {item.isActive === false && <span className="status status-closed">Inactive</span>}
                              {item.isActive !== false && <span>›</span>}
                            </button>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => startEdit(l, item)}
                              disabled={busyId === item._id}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="link-btn danger"
                              onClick={() => deactivateItem(l, item)}
                              disabled={busyId === item._id || item.isActive === false}
                            >
                              {item.isActive === false ? 'Deactivated' : 'Deactivate'}
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {!items.length && <div className="mini-empty">No {l.label.toLowerCase()} records yet.</div>}
                  </div>
                )}
                {!parentReady && <div className="mini-empty">Select the parent step first.</div>}

                {parentReady && (
                  <form className="inline-create" onSubmit={(e) => create(e, l)}>
                    {l.fields.map(([name, label, type]) => (
                      <div className="admin-field compact" key={name}>
                        <label>{label}</label>
                        <input
                          type={type}
                          value={form[name] || ''}
                          required={name !== 'address' && name !== 'contactNumber'}
                          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                        />
                      </div>
                    ))}
                    <button className="btn-secondary" type="submit">+ Add {l.label}</button>
                  </form>
                )}
              </section>
            );
          })}
        </div>

        <aside className="structure-side panel">
          <h3>How the structure works</h3>
          <p>Use the left side from top to bottom. Selecting a parent automatically filters the next level.</p>
          <div className="hierarchy">
            {LEVELS.map((l, i) => (
              <div key={l.key}>
                <span>{l.icon}</span>
                <b>{l.label}</b>
                {i < LEVELS.length - 1 && <em>↓</em>}
              </div>
            ))}
          </div>
          <div className="info-note">
            <b>No IDs needed</b>
            <span>Database IDs are generated and linked automatically. Admin forms should never ask you to paste ObjectIds.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
