import React from 'react';

export function getId(value) {
  return value?._id || value;
}

export function labelForSubject(s) {
  return `${s.code} — ${s.name}`;
}

export function dateTime(date, time) {
  if (!date || !time) return '';
  // Build the Date using the browser's own local timezone, then serialize to
  // a UTC ISO string before it leaves the client. A bare "YYYY-MM-DDTHH:mm"
  // string has no timezone info, so if the backend happens to run in a
  // different timezone than the admin's browser, it gets reparsed using the
  // *server's* local timezone — silently shifting the exam window by the
  // difference (e.g. IST vs UTC is a 5.5 hour offset). Converting here avoids
  // that entirely.
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export const EXAM_TYPES = [
  ['MID_SEM', 'Mid-Semester'],
  ['END_SEM', 'End-Semester'],
  ['QUIZ', 'Quiz'],
  ['PRACTICAL', 'Practical'],
  ['INTERNAL', 'Internal Assessment'],
];

export function SmartSelect({ label, value, onChange, children, hint, required = true }) {
  return (
    <div className="admin-field">
      <label>{label}{required && <span className="required">*</span>}</label>
      <select value={value} onChange={onChange} required={required}>{children}</select>
      {hint && <small>{hint}</small>}
    </div>
  );
}
