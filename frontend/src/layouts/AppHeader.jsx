import React from 'react';

export default function AppHeader({ universityName = 'University Examination Portal' }) {
  return (
    <header className="app-header">
      <span className="institution-name">{universityName}</span>
    </header>
  );
}
