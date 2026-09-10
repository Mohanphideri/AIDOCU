import apiClient from '../api/client';

function loginAs(role) {
  return ({ email, password }) =>
    apiClient.post(`/auth/${role}/login`, { email, password }).then((res) => {
      if (res.data?.token) {
        localStorage.setItem('cbt_token', res.data.token);
        localStorage.setItem('cbt_role', role.toUpperCase());
      }
      return res;
    });
}

export const loginAdmin = loginAs('admin');
export const loginFaculty = loginAs('faculty');
export const loginSupervisor = loginAs('supervisor');

function forgotPasswordAs(role) {
  return ({ email }) => apiClient.post(`/auth/${role}/forgot-password`, { email });
}

function resetPasswordAs(role) {
  return ({ token, password, confirmPassword }) =>
    apiClient.post(`/auth/${role}/reset-password`, { token, password, confirmPassword });
}

export const forgotPasswordAdmin = forgotPasswordAs('admin');
export const forgotPasswordFaculty = forgotPasswordAs('faculty');
export const forgotPasswordSupervisor = forgotPasswordAs('supervisor');

export const resetPasswordAdmin = resetPasswordAs('admin');
export const resetPasswordFaculty = resetPasswordAs('faculty');
export const resetPasswordSupervisor = resetPasswordAs('supervisor');

export function getRole() {
  return localStorage.getItem('cbt_role');
}

export function logoutStaff() {
  localStorage.removeItem('cbt_token');
  localStorage.removeItem('cbt_role');
}
