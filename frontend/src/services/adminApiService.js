import apiClient from '../api/client';

// Exams
export const listExams = (params) => apiClient.get('/exams', { params });
export const createExam = (payload) => apiClient.post('/exams', payload);
export const scheduleExam = (examId) => apiClient.post(`/exams/${examId}/schedule`);
export const transitionExam = (examId, targetStatus) => apiClient.post(`/exams/${examId}/transition`, { targetStatus });
export const publishResults = (examId) => apiClient.post(`/exams/${examId}/results/publish`, { confirm: true });

// Eligibility
export const previewEligibilityCsv = (examId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post(`/exams/${examId}/eligibility/preview`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const importEligibility = (examId, payload) => apiClient.post(`/exams/${examId}/eligibility/import`, payload);
export const listEligibility = (examId, params) => apiClient.get(`/exams/${examId}/eligibility`, { params });
export const addEligibleStudent = (examId, studentId, uid) =>
  apiClient.post(`/exams/${examId}/eligibility/${studentId}`, { uid });
export const removeEligibleStudent = (examId, studentId) =>
  apiClient.delete(`/exams/${examId}/eligibility/${studentId}`);

// Question bank
export const searchQuestions = (params) => apiClient.get('/questions', { params });
export const createQuestion = (payload) => apiClient.post('/questions', payload);
export const approveQuestion = (questionId) => apiClient.post(`/questions/${questionId}/approve`);
export const rejectQuestion = (questionId, notes) => apiClient.post(`/questions/${questionId}/reject`, { notes });

// Faculty submissions (admin side)
export const listFacultySubmissions = (params) => apiClient.get('/faculty-questions', { params });
export const approveFacultySubmission = (submissionId, payload) =>
  apiClient.post(`/faculty-questions/${submissionId}/approve`, payload);
export const rejectFacultySubmission = (submissionId, notes) =>
  apiClient.post(`/faculty-questions/${submissionId}/reject`, { notes });

// Blueprints & papers
export const createBlueprint = (payload) => apiClient.post('/blueprints', payload);
export const generatePaper = (payload) => apiClient.post('/papers/generate', payload);
export const editPaper = (paperId, changes) => apiClient.put(`/papers/${paperId}`, changes);
export const previewPaper = (paperId) => apiClient.get(`/papers/${paperId}/preview`);
export const analyzePaper = (paperId) => apiClient.get(`/papers/${paperId}/analysis`);
export const lockPaper = (paperId) => apiClient.post(`/papers/${paperId}/lock`);

// Translations
export const listPapers = (params) => apiClient.get('/papers', { params });
export const generateTranslations = (payload) => apiClient.post('/translations/generate', payload);
export const listTranslationsForPaper = (paperId) => apiClient.get(`/translations/paper/${paperId}`);
export const reviewTranslation = (translationId, payload) => apiClient.put(`/translations/${translationId}`, payload);
export const approveTranslation = (translationId) => apiClient.post(`/translations/${translationId}/approve`);
export const regenerateTranslation = (translationId, provider) =>
  apiClient.post(`/translations/${translationId}/regenerate`, { provider });

// Academic structure
export const listAcademic = (entity) => apiClient.get(`/academic/${entity}`);
export const createAcademic = (entity, payload) => apiClient.post(`/academic/${entity}`, payload);

// Results (admin review workflow)
export const listResultsForExam = (examId) => apiClient.get(`/exams/${examId}/results`);
export const finalizeResult = (resultId) => apiClient.post(`/results/${resultId}/finalize`);
export const correctResult = (resultId, changes, reason) =>
  apiClient.post(`/results/${resultId}/correct`, { changes, reason });

// Student queries (admin review/resolution)
export const listQueries = (params) => apiClient.get('/admin/queries', { params });
export const resolveQuery = (queryId, status, resolution) =>
  apiClient.post(`/admin/queries/${queryId}/resolve`, { status, resolution });

// Audit
export const searchAudit = (params) => apiClient.get('/admin/audit', { params });

// Dashboard overview
export const getDashboardStats = () => apiClient.get('/admin/dashboard/stats');
export const getProctoringAlerts = (limit) => apiClient.get('/admin/dashboard/proctoring-alerts', { params: { limit } });

// Student management
export const listStudents = (params) => apiClient.get('/admin/students', { params });
export const getStudent = (studentId) => apiClient.get(`/admin/students/${studentId}`);
export const updateStudentStatus = (studentId, accountStatus, reason) =>
  apiClient.post(`/admin/students/${studentId}/status`, { accountStatus, reason });
