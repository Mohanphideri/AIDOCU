const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = `${API_ORIGIN}/api`;

function getToken() {
  return localStorage.getItem('documentai_token');
}

async function request(path, { method = 'GET', body, isForm = false, headers = {} } = {}) {
  const token = getToken();
  const finalHeaders = { ...headers };

  // Do not add Content-Type to requests without a body. This avoids
  // unnecessary CORS preflights for public GET endpoints such as CAPTCHA.
  if (!isForm && body !== undefined && body !== null) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = data?.error || 'Something went wrong. Please try again.';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

let captchaInFlight = null;

function getCaptchaFast() {
  if (!captchaInFlight) {
    captchaInFlight = request('/auth/captcha').finally(() => {
      captchaInFlight = null;
    });
  }
  return captchaInFlight;
}

export const api = {
  // auth
  // Deduplicates simultaneous CAPTCHA requests (including React StrictMode).
  getCaptcha: () => getCaptchaFast(),
  refreshCaptcha: (captchaId) => request('/auth/captcha/refresh', { method: 'POST', body: { captchaId } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  verifyRegistration: (payload) => request('/auth/verify-registration', { method: 'POST', body: payload }),
  resendRegistrationOtp: (payload) => request('/auth/resend-registration-otp', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: { credential } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PATCH', body: payload }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload }),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),

  // documents
  listDocuments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/documents${qs ? `?${qs}` : ''}`);
  },
  getDocument: (id) => request(`/documents/${id}`),
  uploadDocument: (file, name) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return request('/documents/upload', { method: 'POST', body: form, isForm: true });
  },
  updateDocument: (id, payload) => request(`/documents/${id}`, { method: 'PATCH', body: payload }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  downloadUrl: (id) => `${BASE}/documents/${id}/download`,
  askQuestion: (id, question) => request(`/documents/${id}/question`, { method: 'POST', body: { question } }),
  summarizeDocument: (id, length) => request(`/documents/${id}/summarize`, { method: 'POST', body: { length } }),
  getKeywords: (id) => request(`/documents/${id}/keywords`),
  getKeyPoints: (id) => request(`/documents/${id}/key-points`),
  getSourcePage: (id, page) => request(`/documents/${id}/sources/${page}`),

  // conversations
  listConversations: (q) => request(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createConversation: (payload) => request('/conversations', { method: 'POST', body: payload }),
  getConversation: (id) => request(`/conversations/${id}`),
  updateConversation: (id, payload) => request(`/conversations/${id}`, { method: 'PATCH', body: payload }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (id, content) => request(`/conversations/${id}/messages`, { method: 'POST', body: { content } }),
  regenerateMessage: (convoId, messageId) => request(`/conversations/${convoId}/regenerate/${messageId}`, { method: 'POST' }),
  setFeedback: (messageId, feedback) => request(`/messages/${messageId}/feedback`, { method: 'PATCH', body: { feedback } }),

  // PDF export — returns a Blob the caller can turn into a download link.
  exportConversationPdf: async (id) => {
    const token = getToken();
    const res = await fetch(`${BASE}/conversations/${id}/export/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = 'Could not generate the PDF.';
      try {
        const data = await res.json();
        message = data?.error || message;
      } catch {
        // no JSON body
      }
      throw new Error(message);
    }
    return res.blob();
  },

  // Public share links
  shareConversation: (id) => request(`/conversations/${id}/share`, { method: 'POST' }),
  unshareConversation: (id) => request(`/conversations/${id}/share`, { method: 'DELETE' }),
  getSharedConversation: (shareId) => request(`/conversations/shared/${shareId}`),
};

export { getToken };
