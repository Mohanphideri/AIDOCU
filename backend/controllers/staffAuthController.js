const authService = require('../services/authService');
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

module.exports = {
  adminLogin: makeLoginHandler(authService.adminLogin),
  facultyLogin: makeLoginHandler(authService.facultyLogin),
  supervisorLogin: makeLoginHandler(authService.supervisorLogin),
};
