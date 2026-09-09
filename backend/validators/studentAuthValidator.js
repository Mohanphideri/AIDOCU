const { body, validationResult } = require('express-validator');
const { ApiError } = require('../middleware/errorHandler');

function checkValidation(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const first = result.array()[0];
    return next(new ApiError(first.msg, 400, 'VALIDATION_ERROR'));
  }
  return next();
}

const registerRules = [
  body('universityId').isMongoId().withMessage('Valid universityId is required'),
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required'),
  body('uid').trim().isLength({ min: 2, max: 40 }).withMessage('UID is required'),
  body('universityEmail').isEmail().withMessage('A valid university email is required'),
  body('phone').trim().isLength({ min: 7, max: 20 }).withMessage('A valid phone number is required'),
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

const verifyRules = [
  body('studentId').isMongoId().withMessage('Valid studentId is required'),
  body('code').trim().isLength({ min: 4, max: 8 }).withMessage('Invalid verification code'),
  checkValidation,
];

const loginRules = [
  body('uid').trim().notEmpty().withMessage('UID is required'),
  body('password').notEmpty().withMessage('Password is required'),
  checkValidation,
];

module.exports = { registerRules, verifyRules, loginRules, checkValidation };
