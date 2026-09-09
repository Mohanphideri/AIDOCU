import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppHeader from './layouts/AppHeader';
import ProtectedRoute from './routes/ProtectedRoute';
import StaffProtectedRoute from './routes/StaffProtectedRoute';

import RegisterPage from './student/RegisterPage';
import VerifyEmailPage from './student/VerifyEmailPage';
import LoginPage from './student/LoginPage';
import DashboardPage from './student/DashboardPage';
import PreExamSecurityPage from './student/PreExamSecurityPage';
import ExamPage from './student/ExamPage';
import ExamSubmittedPage from './student/ExamSubmittedPage';
import ResultPage from './student/ResultPage';
import QueriesPage from './student/QueriesPage';

import StaffLoginPage from './auth/StaffLoginPage';
import { loginAdmin, loginFaculty, loginSupervisor } from './services/staffAuthService';
import AdminDashboardPage from './admin/AdminDashboardPage';
import FacultySubmissionPage from './faculty/FacultySubmissionPage';
import SupervisorDashboardPage from './supervisor/SupervisorDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppHeader />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Student */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/security"
            element={
              <ProtectedRoute>
                <PreExamSecurityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/attempt/:attemptId"
            element={
              <ProtectedRoute>
                <ExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/submitted"
            element={
              <ProtectedRoute>
                <ExamSubmittedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:resultId"
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/attempt/:attemptId/queries"
            element={
              <ProtectedRoute>
                <QueriesPage />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/login"
            element={<StaffLoginPage title="Admin Login" loginFn={loginAdmin} redirectTo="/admin/dashboard" />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <StaffProtectedRoute role="ADMIN">
                <AdminDashboardPage />
              </StaffProtectedRoute>
            }
          />

          {/* Faculty */}
          <Route
            path="/faculty/login"
            element={<StaffLoginPage title="Faculty Login" loginFn={loginFaculty} redirectTo="/faculty/dashboard" />}
          />
          <Route
            path="/faculty/dashboard"
            element={
              <StaffProtectedRoute role="FACULTY">
                <FacultySubmissionPage />
              </StaffProtectedRoute>
            }
          />

          {/* Supervisor */}
          <Route
            path="/supervisor/login"
            element={<StaffLoginPage title="Supervisor Login" loginFn={loginSupervisor} redirectTo="/supervisor/dashboard" />}
          />
          <Route
            path="/supervisor/dashboard"
            element={
              <StaffProtectedRoute role="SUPERVISOR">
                <SupervisorDashboardPage />
              </StaffProtectedRoute>
            }
          />

          {/* Live supervisor monitoring (real camera/mic feeds, intervention
              controls) is intentionally deferred — see README. */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
