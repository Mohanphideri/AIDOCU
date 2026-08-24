import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('documentai_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('documentai_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, user) => {
    localStorage.setItem('documentai_token', token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('documentai_token');
    setUser(null);
  }, []);

  // Bumps the server-side tokenVersion, which immediately invalidates
  // every previously issued JWT (including on other devices), then signs
  // this device back in with a freshly issued token.
  const logoutAllSessions = useCallback(async () => {
    const { token } = await api.logoutAll();
    localStorage.setItem('documentai_token', token);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAllSessions, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
