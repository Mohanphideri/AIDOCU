import apiClient from '../api/client';

export function listUniversities() {
  return apiClient.get('/auth/student/universities');
}

export function registerStudent(payload) {
  return apiClient.post('/auth/student/register', payload);
}

export function verifyEmail(payload) {
  return apiClient.post('/auth/student/verify', payload);
}

export function resendVerification(studentId) {
  return apiClient.post('/auth/student/resend-verification', { studentId });
}

export function loginStudent({ uid, password }) {
  return apiClient.post('/auth/student/login', { uid, password }).then((res) => {
    if (res.data?.token) {
      localStorage.setItem('cbt_token', res.data.token);
    }
    return res;
  });
}

export function getMyProfile() {
  return apiClient.get('/auth/student/me');
}

export function logout() {
  localStorage.removeItem('cbt_token');
}

export function forgotPassword({ email }) {
  return apiClient.post('/auth/student/forgot-password', { email });
}

export function resetPassword({ token, password, confirmPassword }) {
  return apiClient.post('/auth/student/reset-password', { token, password, confirmPassword });
}
