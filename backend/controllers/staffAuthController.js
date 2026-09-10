const authService = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');
const { success } = require('../utils/apiResponse');

function makeLoginHandler(loginFn) {
  return async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await loginFn(email, password);
      return success(res, result, 'Login successful');
    } catch (err) {
      return next(err);
    }
  };
}

function makeForgotPasswordHandler(role) {
  return async (req, res, next) => {
    try {
      const { email } = req.body;
      await passwordResetService.requestPasswordReset({ role, email });
      return success(res, {}, 'If that email is registered, a password reset link has been sent.');
    } catch (err) {
      return next(err);
    }
  };
}

function makeResetPasswordHandler(role) {
  return async (req, res, next) => {
    try {
      const { token, password } = req.body;
      await passwordResetService.resetPassword({ role, token, newPassword: password });
      return success(res, {}, 'Your password has been reset. You may now log in.');
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  adminLogin: makeLoginHandler(authService.adminLogin),
  facultyLogin: makeLoginHandler(authService.facultyLogin),
  supervisorLogin: makeLoginHandler(authService.supervisorLogin),

  adminForgotPassword: makeForgotPasswordHandler('ADMIN'),
  facultyForgotPassword: makeForgotPasswordHandler('FACULTY'),
  supervisorForgotPassword: makeForgotPasswordHandler('SUPERVISOR'),

  adminResetPassword: makeResetPasswordHandler('ADMIN'),
  facultyResetPassword: makeResetPasswordHandler('FACULTY'),
  supervisorResetPassword: makeResetPasswordHandler('SUPERVISOR'),
};
