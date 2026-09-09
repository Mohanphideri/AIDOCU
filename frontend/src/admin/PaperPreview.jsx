import React from 'react';

/**
 * A print-style rendering of a paper's questions, grouped by section — the
 * "formal branded preview" the spec calls for, as opposed to the raw JSON
 * the old Analyze view showed. Print-friendly via the browser's own
 * print dialog (window.print), no separate PDF pipeline needed.
 */
export default function PaperPreview({ exam, examQuestions }) {
  const bySection = new Map();
  for (const eq of examQuestions) {
    const list = bySection.get(eq.sectionName) || [];
    list.push(eq);
    bySection.set(eq.sectionName, list);
  }

  const totalMarks = examQuestions.reduce((sum, eq) => sum + eq.marks, 0);

  return (
    <div
      className="paper-preview"
      style={{
        background: '#fff',
        color: '#111',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '28px 32px',
        maxWidth: 760,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: 0.5 }}>EXAMINATION PAPER</div>
        <div style={{ marginTop: 6 }}>{exam?.subjectCode} — {exam?.examType}</div>
        <div style={{ fontSize: '0.9rem', color: '#444', marginTop: 4 }}>
          Total Marks: {totalMarks} &nbsp;|&nbsp; Total Questions: {examQuestions.length}
          {exam?.durationMinutes ? <> &nbsp;|&nbsp; Duration: {exam.durationMinutes} minutes</> : null}
        </div>
      </div>

      {[...bySection.entries()].map(([sectionName, items]) => (
        <div key={sectionName} style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 8 }}>{sectionName}</div>
          {items.map((eq, idx) => {
            const version = eq.questionVersionId || {};
            return (
              <div key={eq._id} style={{ marginBottom: 12 }}>
                <div>
                  <strong>{idx + 1}.</strong> {version.questionText} <span style={{ color: '#555' }}>[{eq.marks} mark{eq.marks !== 1 ? 's' : ''}]</span>
                </div>
                {version.options && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginLeft: 20, marginTop: 4 }}>
                    {['A', 'B', 'C', 'D'].map((key) => (
                      <div key={key}>({key}) {version.options[key]}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
    </div>
  );
}
