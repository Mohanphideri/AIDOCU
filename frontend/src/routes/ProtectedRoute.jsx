import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('cbt_token');
  const location = useLocation();

  if (!token) {
    // Remember where the student was trying to go (e.g. a direct link to
    // an active exam from their "exam is live" email) so LoginPage can
    // send them straight there after they sign in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
