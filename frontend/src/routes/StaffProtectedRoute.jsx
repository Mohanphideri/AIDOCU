import React from 'react';
import { Navigate } from 'react-router-dom';
import { getRole } from '../services/staffAuthService';

export default function StaffProtectedRoute({ role, children }) {
  const token = localStorage.getItem('cbt_token');
  const currentRole = getRole();

  if (!token || currentRole !== role) {
    return <Navigate to={`/${role.toLowerCase()}/login`} replace />;
  }
  return children;
}
