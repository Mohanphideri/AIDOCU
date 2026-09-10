import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppHeader from './layouts/AppHeader';
import ProtectedRoute from './routes/ProtectedRoute';
import StaffProtectedRoute from './routes/StaffProtectedRoute';

import RegisterPage from './student/RegisterPage';
import VerifyEmailPage from './student/VerifyEmailPage';
import LoginPage from './student/LoginPage';
import ForgotPasswordPage from './student/ForgotPasswordPage';
import ResetPasswordPage from './student/ResetPasswordPage';
import DashboardPage from './student/DashboardPage';
import PreExamSecurityPage from './student/PreExamSecurityPage';
import ExamPage from './student/ExamPage';
import ExamSubmittedPage from './student/ExamSubmittedPage';
import ResultPage from './student/ResultPage';
import QueriesPage from './student/QueriesPage';

import StaffLoginPage from './auth/StaffLoginPage';
import StaffForgotPasswordPage from './auth/StaffForgotPasswordPage';
import StaffResetPasswordPage from './auth/StaffResetPasswordPage';
import {
  loginAdmin,
  loginFaculty,
  loginSupervisor,
  forgotPasswordAdmin,
  forgotPasswordFaculty,
  forgotPasswordSupervisor,
  resetPasswordAdmin,
  resetPasswordFaculty,
  resetPasswordSupervisor,
} from './services/staffAuthService';
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
            element={<StaffLoginPage title="Admin Login" loginFn={loginAdmin} redirectTo="/admin/dashboard" forgotPasswordPath="/admin/forgot-password" />}
          />
          <Route
            path="/admin/forgot-password"
            element={<StaffForgotPasswordPage title="Admin — Forgot Password" forgotPasswordFn={forgotPasswordAdmin} loginPath="/admin/login" />}
          />
          <Route
            path="/admin/reset-password/:token"
            element={
              <StaffResetPasswordPage
                title="Admin — Reset Password"
                resetPasswordFn={resetPasswordAdmin}
                loginPath="/admin/login"
                forgotPasswordPath="/admin/forgot-password"
              />
            }
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
            element={<StaffLoginPage title="Faculty Login" loginFn={loginFaculty} redirectTo="/faculty/dashboard" forgotPasswordPath="/faculty/forgot-password" />}
          />
          <Route
            path="/faculty/forgot-password"
            element={<StaffForgotPasswordPage title="Faculty — Forgot Password" forgotPasswordFn={forgotPasswordFaculty} loginPath="/faculty/login" />}
          />
          <Route
            path="/faculty/reset-password/:token"
            element={
              <StaffResetPasswordPage
                title="Faculty — Reset Password"
                resetPasswordFn={resetPasswordFaculty}
                loginPath="/faculty/login"
                forgotPasswordPath="/faculty/forgot-password"
              />
            }
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
            element={<StaffLoginPage title="Supervisor Login" loginFn={loginSupervisor} redirectTo="/supervisor/dashboard" forgotPasswordPath="/supervisor/forgot-password" />}
          />
          <Route
            path="/supervisor/forgot-password"
            element={<StaffForgotPasswordPage title="Supervisor — Forgot Password" forgotPasswordFn={forgotPasswordSupervisor} loginPath="/supervisor/login" />}
          />
          <Route
            path="/supervisor/reset-password/:token"
            element={
              <StaffResetPasswordPage
                title="Supervisor — Reset Password"
                resetPasswordFn={resetPasswordSupervisor}
                loginPath="/supervisor/login"
                forgotPasswordPath="/supervisor/forgot-password"
              />
            }
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
