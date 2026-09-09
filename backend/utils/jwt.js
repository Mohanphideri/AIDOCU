const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Payload should always include: { sub: userId, role: 'ADMIN'|'FACULTY'|'SUPERVISOR'|'STUDENT', universityId }
 * Never put secrets, passwords, or full documents into the token.
 */
function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
