import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout as studentLogout } from '../services/studentAuthService';
import { getRole, logoutStaff } from '../services/staffAuthService';

const ROLE_LABELS = {
  FACULTY: 'Faculty',
  SUPERVISOR: 'Supervisor',
};

export default function AppHeader({ universityName = 'University Examination Portal' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // The admin portal has its own sidebar/topbar with its own logout control.
  if (location.pathname.startsWith('/admin/')) return null;
  // The student dashboard has its own header (refresh + logout) built in.
  if (location.pathname === '/dashboard') return null;

  const isStaffRoute = location.pathname.startsWith('/faculty/') || location.pathname.startsWith('/supervisor/');
  const isAuthRoute = /\/(login|register|verify-email|forgot-password|reset-password)/.test(location.pathname);
  const token = localStorage.getItem('cbt_token');
  const showLogout = !!token && !isAuthRoute;

  function handleLogout() {
    if (isStaffRoute) {
      const role = getRole();
      logoutStaff();
      navigate(`/${(role || 'admin').toLowerCase()}/login`);
    } else {
      studentLogout();
      navigate('/login');
    }
  }

  const roleLabel = isStaffRoute ? ROLE_LABELS[getRole()] || 'Staff' : 'Student';

  return (
    <header className="app-header">
      <span className="institution-name">
        <span className="header-mark">U</span>
        {universityName}
      </span>
      {showLogout && (
        <div className="header-right">
          <span className="header-user">
            <strong>{roleLabel} Portal</strong>
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
