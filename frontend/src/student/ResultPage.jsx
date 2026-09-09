import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMyResult } from '../services/examApiService';

export default function ResultPage() {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyResult(resultId)
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.message || 'Could not load result'));
  }, [resultId]);

  if (error) {
    return (
      <div className="page-container">
        <h1>Result</h1>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="page-container">
        <p>Loading result…</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Examination Result</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>Maximum Marks</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{result.maximumMarks}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>Obtained Marks</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{result.obtainedMarks}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>Percentage</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{result.percentage}%</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>Grade</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{result.grade}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>Result</td>
            <td
              style={{
                padding: '8px 0',
                textAlign: 'right',
                fontWeight: 700,
                color: result.passFail === 'PASS' ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {result.passFail}
            </td>
          </tr>
        </tbody>
      </table>
      {result.attemptId && (
        <p style={{ marginTop: 20 }}>
          <Link to={`/exam/attempt/${result.attemptId}/queries`}>File a query about a question in this exam</Link>
        </p>
      )}
    </div>
  );
}
