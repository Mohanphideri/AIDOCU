import apiClient from '../api/client';

export const submitQuestion = (payload) => apiClient.post('/faculty-questions', payload);
export const listMySubmissions = (params) => apiClient.get('/faculty-questions/mine', { params });
