import React, { useEffect, useState } from 'react';
import { listExams } from '../services/adminApiService';

export default function SupervisorDashboardPage() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    listExams({ status: 'ACTIVE' })
      .then((res) => setExams(res.data.items || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <h1>Supervisor — Live Examinations</h1>
      {error && <div className="error-text">{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            <th>Subject Code</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td>{exam.subjectCode}</td>
              <td>{exam.examType}</td>
              <td>{exam.status}</td>
            </tr>
          ))}
          {!exams.length && (
            <tr>
              <td colSpan={3} style={{ color: 'var(--color-text-muted)' }}>No active examinations right now.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p style={{ color: 'var(--color-text-muted)', marginTop: 24 }}>
        Live candidate cards (camera/mic status, remaining time, fullscreen violations, event
        timeline, intervention controls) require the Socket.IO supervisor room wiring in
        <code> server.js</code> plus a dedicated media/WebRTC layer for camera/microphone
        streaming — see the README&apos;s proctoring architecture section for what&apos;s scaffolded
        versus what still needs a real media server.
      </p>
    </div>
  );
}
