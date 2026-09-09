const { body } = require('express-validator');
const { checkValidation } = require('./studentAuthValidator');

const staffLoginRules = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  checkValidation,
];

module.exports = { staffLoginRules };
