require('dotenv').config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

const env = {
  NODE_ENV: required('NODE_ENV', 'development'),
  PORT: parseInt(required('PORT', '5000'), 10),
  CLIENT_URL: required('CLIENT_URL', 'http://localhost:5173'),

  MONGODB_URI: required('MONGODB_URI'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: required('JWT_EXPIRES_IN', '8h'),
  SESSION_SECRET: required('SESSION_SECRET'),
  BCRYPT_SALT_ROUNDS: parseInt(required('BCRYPT_SALT_ROUNDS', '12'), 10),

  BREVO_API_KEY: required('BREVO_API_KEY'),
  BREVO_SENDER_EMAIL: required('BREVO_SENDER_EMAIL'),
  BREVO_SENDER_NAME: required('BREVO_SENDER_NAME', 'University Examination Cell'),

  DEFAULT_UNIVERSITY_EMAIL_DOMAIN: required('DEFAULT_UNIVERSITY_EMAIL_DOMAIN', 'university.edu'),

  VERIFICATION_CODE_EXPIRY_MINUTES: parseInt(required('VERIFICATION_CODE_EXPIRY_MINUTES', '10'), 10),
  VERIFICATION_MAX_ATTEMPTS: parseInt(required('VERIFICATION_MAX_ATTEMPTS', '5'), 10),
  VERIFICATION_RESEND_COOLDOWN_SECONDS: parseInt(required('VERIFICATION_RESEND_COOLDOWN_SECONDS', '60'), 10),
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: parseInt(required('PASSWORD_RESET_TOKEN_EXPIRY_MINUTES', '30'), 10),

  RATE_LIMIT_WINDOW_MS: parseInt(required('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(required('RATE_LIMIT_MAX', '100'), 10),

  MEDIA_SERVER_URL: required('MEDIA_SERVER_URL', ''),
};

function assertRequiredEnv() {
  const mustHave = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];
  const missing = mustHave.filter((key) => !env[key]);
  if (missing.length && env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (missing.length) {
    console.warn(`[env] Warning: missing env vars (fine for local scaffolding, required before production): ${missing.join(', ')}`);
  }
}

module.exports = { env, assertRequiredEnv };
