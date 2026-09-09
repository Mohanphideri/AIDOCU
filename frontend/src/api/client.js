import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cbt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error.response?.data || { success: false, message: 'Network error', code: 'NETWORK_ERROR' };
    if (error.response?.status === 401) {
      localStorage.removeItem('cbt_token');
    }
    return Promise.reject(payload);
  }
);

export default apiClient;
