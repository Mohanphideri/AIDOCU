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

export function getRole() {
  return localStorage.getItem('cbt_role');
}

export function logoutStaff() {
  localStorage.removeItem('cbt_token');
  localStorage.removeItem('cbt_role');
}
