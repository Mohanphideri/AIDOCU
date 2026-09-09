import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function ExamSubmittedPage() {
  const location = useLocation();
  const attemptId = location.state?.attemptId;

  return (
    <div className="page-container">
      <div className="success-banner">Your examination has been submitted successfully.</div>
      <h1>Submission Received</h1>
      <p>
        Your answers have been recorded and your result is being processed. Results are reviewed by the
        examination team before being published — you will be notified by email once your result is available.
      </p>
      <p>
        <Link to="/dashboard">Return to Dashboard</Link>
        {attemptId && (
          <>
            {' · '}
            <Link to={`/exam/attempt/${attemptId}/queries`}>File a query about a question</Link>
          </>
        )}
      </p>
    </div>
  );
}
