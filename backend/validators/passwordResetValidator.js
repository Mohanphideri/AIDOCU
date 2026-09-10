const { body } = require('express-validator');
const { checkValidation } = require('./studentAuthValidator');

const forgotPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required'),
  checkValidation,
];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  checkValidation,
];

module.exports = { forgotPasswordRules, resetPasswordRules };
