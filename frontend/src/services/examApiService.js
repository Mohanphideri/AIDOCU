import apiClient from '../api/client';

export const listActiveExams = () => apiClient.get('/exams', { params: { status: 'ACTIVE' } });
export const getExam = (examId) => apiClient.get(`/exams/${examId}`);

export const startAttempt = (examId) => apiClient.post(`/exams/${examId}/start`);
export const getAttempt = (attemptId) => apiClient.get(`/attempts/${attemptId}`);
export const getAttemptStatus = (attemptId) => apiClient.get(`/attempts/${attemptId}/status`);
export const getAttemptQuestions = (attemptId) => apiClient.get(`/attempts/${attemptId}/questions`);
export const changeLanguage = (attemptId, language) => apiClient.post(`/attempts/${attemptId}/language`, { language });

export const saveAnswer = (attemptId, attemptQuestionId, selectedOption) =>
  apiClient.post(`/attempts/${attemptId}/answer`, { attemptQuestionId, selectedOption });

export const markForReview = (attemptId, attemptQuestionId, markedForReview) =>
  apiClient.post(`/attempts/${attemptId}/mark-review`, { attemptQuestionId, markedForReview });

export const submitAttempt = (attemptId) => apiClient.post(`/attempts/${attemptId}/submit`);

export const recordProctoringEvent = (attemptId, examId, type, metadata = {}) =>
  apiClient.post(`/attempts/${attemptId}/proctoring-events`, { examId, type, metadata }).catch(() => {
    // Proctoring events are best-effort from the client's perspective — a
    // failed POST here must never block the student's exam experience.
  });

export const getMyResult = (resultId) => apiClient.get(`/results/${resultId}`);

// Student queries (file a query about a question, and check its status)
export const listMyQueries = (attemptId) => apiClient.get(`/attempts/${attemptId}/queries`);

export const submitQuery = (attemptId, payload) => apiClient.post(`/attempts/${attemptId}/queries`, payload);
