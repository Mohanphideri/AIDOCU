import React from 'react';
import { useLocation } from 'react-router-dom';
export default function AppHeader({ universityName='University Examination Portal' }) {
  const location=useLocation();
  if(location.pathname.startsWith('/admin/')) return null;
  return <header className="app-header"><span className="institution-name">{universityName}</span></header>;
}
