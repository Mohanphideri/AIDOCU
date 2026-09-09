import apiClient from '../api/client';

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

export function logout() {
  localStorage.removeItem('cbt_token');
}
