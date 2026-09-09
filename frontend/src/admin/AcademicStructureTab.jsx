import React, { useEffect, useState, useCallback } from 'react';
import * as adminApi from '../services/adminApiService';

// One row of the academic hierarchy: University -> AcademicSession -> Faculty
// -> Department -> Programme -> Semester -> Subject. Each level's create form
// only enables once its parent has been selected, mirroring the spec's
// hierarchy (section 4) and preventing orphaned records.
const LEVELS = [
  { key: 'universities', label: 'University', fields: [
      { name: 'name', label: 'Name' },
      { name: 'officialEmail', label: 'Official Email' },
      { name: 'emailDomain', label: 'Student Email Domain (e.g. university.edu)' },
      { name: 'address', label: 'Address', optional: true },
      { name: 'contactNumber', label: 'Contact Number', optional: true },
    ] },
  { key: 'sessions', label: 'Academic Session', parent: 'universityId', parentLevel: 'universities', fields: [
      { name: 'name', label: 'Name (e.g. 2025-2026)' },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
    ] },
  { key: 'faculties', label: 'Faculty / School', parent: 'universityId', parentLevel: 'universities', fields: [
      { name: 'name', label: 'Name' },
      { name: 'code', label: 'Code' },
    ] },
  { key: 'departments', label: 'Department', parent: 'facultyId', parentLevel: 'faculties', fields: [
      { name: 'name', label: 'Name' },
      { name: 'code', label: 'Code' },
    ], carryUniversity: true },
  { key: 'programmes', label: 'Programme', parent: 'departmentId', parentLevel: 'departments', fields: [
      { name: 'name', label: 'Name' },
      { name: 'code', label: 'Code' },
      { name: 'durationSemesters', label: 'Duration (semesters)', type: 'number' },
    ], carryUniversity: true },
  { key: 'semesters', label: 'Semester', parent: 'programmeId', parentLevel: 'programmes', fields: [
      { name: 'number', label: 'Semester Number', type: 'number' },
    ], carryUniversity: true, needsSession: true },
  { key: 'subjects', label: 'Subject', parent: 'semesterId', parentLevel: 'semesters', fields: [
      { name: 'name', label: 'Name' },
      { name: 'code', label: 'Subject Code' },
    ], carryUniversity: true, needsProgramme: true },
];

function LevelPanel({ level, allData, selected, onSelect, onCreated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const items = allData[level.key] || [];

  const parentId = level.parent ? selected[level.parentLevel] : null;
  const filteredItems = level.parent
    ? items.filter((item) => (item[level.parent]?._id || item[level.parent]) === parentId)
    : items;

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form };
      if (level.parent) payload[level.parent] = parentId;
      if (level.carryUniversity) payload.universityId = selected.universities;
      if (level.needsSession) payload.academicSessionId = selected.sessions;
      if (level.needsProgramme) {
        payload.programmeId = selected.programmes;
      }
      await adminApi.createAcademic(level.key, payload);
      setForm({});
      onCreated(level.key);
    } catch (err) {
      setError(err.message || `Could not create ${level.label}`);
    }
  }

  const parentReady = !level.parent || Boolean(parentId);
  const sessionReady = !level.needsSession || Boolean(selected.sessions);

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', padding: '16px 0' }}>
      <h3>{level.label}</h3>
      {!parentReady && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Select a {LEVELS.find((l) => l.key === level.parentLevel)?.label} above first.
        </p>
      )}
      {parentReady && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {filteredItems.map((item) => (
              <button
                key={item._id}
                type="button"
                className={selected[level.key] === item._id ? 'btn-primary' : 'btn-secondary'}
                onClick={() => onSelect(level.key, item._id)}
              >
                {item.name || `#${item.number}` || item.code}
              </button>
            ))}
            {!filteredItems.length && <span style={{ color: 'var(--color-text-muted)' }}>None yet.</span>}
          </div>

          {sessionReady && (
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {level.fields.map((f) => (
                <div className="form-field" key={f.name} style={{ minWidth: 160 }}>
                  <label>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.name] || ''}
                    required={!f.optional}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                </div>
              ))}
              <button className="btn-primary" type="submit">Add {level.label}</button>
            </form>
          )}
          {level.needsSession && !selected.sessions && (
            <p style={{ color: 'var(--color-text-muted)' }}>Select an Academic Session above to add a Semester.</p>
          )}
          {error && <div className="error-text">{error}</div>}
        </>
      )}
    </div>
  );
}

export default function AcademicStructureTab() {
  const [allData, setAllData] = useState({});
  const [selected, setSelected] = useState({});
  const [error, setError] = useState(null);

  const loadOne = useCallback((key) => {
    adminApi
      .listAcademic(key)
      .then((res) => setAllData((prev) => ({ ...prev, [key]: res.data || [] })))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    LEVELS.forEach((l) => loadOne(l.key));
  }, [loadOne]);

  function handleSelect(levelKey, id) {
    setSelected((prev) => {
      const next = { ...prev, [levelKey]: id };
      // Selecting a level resets any deeper selections so dependent lists
      // (and create forms) stay consistent with the chosen parent.
      const idx = LEVELS.findIndex((l) => l.key === levelKey);
      LEVELS.slice(idx + 1).forEach((l) => delete next[l.key]);
      return next;
    });
  }

  return (
    <div>
      <h2>Academic Structure</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Build the hierarchy top-down: University → Academic Session / Faculty → Department →
        Programme → Semester → Subject. Subjects created here become selectable when creating an
        examination.
      </p>
      {error && <div className="error-text">{error}</div>}
      {LEVELS.map((level) => (
        <LevelPanel
          key={level.key}
          level={level}
          allData={allData}
          selected={selected}
          onSelect={handleSelect}
          onCreated={loadOne}
        />
      ))}
    </div>
  );
}
