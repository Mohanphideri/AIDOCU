const bcrypt = require('bcrypt');
const { env } = require('../config/env');

async function hashPassword(plainPassword) {
  const saltRounds = env.BCRYPT_SALT_ROUNDS || 12;
  return bcrypt.hash(plainPassword, saltRounds);
}

async function comparePassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };
