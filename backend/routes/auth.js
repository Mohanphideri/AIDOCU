const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendRegistrationOtpEmail, isConfigured: isEmailConfigured } = require('../services/emailService');
const User = require('../models/User');
const RegistrationOtp = require('../models/RegistrationOtp');
const { requireAuth } = require('../middleware/auth');
const { verifyCaptcha } = require('../middleware/captcha');
const { authLimiter } = require('../middleware/rateLimiters');
const { generateCaptcha, invalidateCaptcha } = require('../services/captchaService');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;


function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

// ---- CAPTCHA ---------------------------------------------------------
// GET /api/auth/captcha -> { captchaId, image }. The plaintext answer is
// never included in the response — see services/captchaService.js.
router.get('/captcha', authLimiter, async (req, res) => {
  try {
    // sessionId groups challenges per browser session; a random id is
    // fine here since ownership is enforced by possessing captchaId itself.
    const sessionId = req.headers['x-session-id'] || uuid();
    const { captchaId, image } = await generateCaptcha(sessionId);
    res.json({ captchaId, image });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate a CAPTCHA. Please try again.' });
  }
});

// Explicit refresh endpoint: invalidates the old challenge (so it can
// never be answered) and issues a brand new one.
router.post('/captcha/refresh', authLimiter, async (req, res) => {
  try {
    const { captchaId } = req.body || {};
    if (captchaId) await invalidateCaptcha(captchaId);
    const sessionId = req.headers['x-session-id'] || uuid();
    const { captchaId: newId, image } = await generateCaptcha(sessionId);
    res.json({ captchaId: newId, image });
  } catch (err) {
    res.status(500).json({ error: 'Could not refresh the CAPTCHA. Please try again.' });
  }
});

// ---- Register / email verification ------------------------------------
router.post('/register', authLimiter, verifyCaptcha, async (req, res) => {
  try {
    const { name, email, password, confirmPassword, acceptTerms } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (!acceptTerms) {
      return res.status(400).json({ error: 'You must accept the terms to continue.' });
    }
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({
        error: 'Password must be 8+ characters and include uppercase, lowercase, a number, and a special character.',
      });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Verification email service is not configured. Please contact the administrator.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: existing.emailVerified === false ? 'This email is already registered but not verified. Please request a new verification code.' : 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresMinutes = Number(process.env.REGISTRATION_OTP_EXPIRE_MINUTES) || 10;

    await RegistrationOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
        attempts: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendRegistrationOtpEmail({ to: normalizedEmail, name: name.trim(), otp, expiresMinutes });
    } catch (mailErr) {
      await RegistrationOtp.deleteOne({ email: normalizedEmail }).catch(() => {});
      console.error('[Registration verification] Brevo API delivery failed:', mailErr.message);
      return res.status(502).json({ error: 'We could not send the verification email. Please try again later.' });
    }

    return res.status(202).json({ success: true, requiresVerification: true, email: normalizedEmail, message: 'A verification code has been sent to your email.' });
  } catch (err) {
    console.error('[Registration] Request failed:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/verify-registration', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'A valid 6-digit verification code is required.' });
    }

    const pending = await RegistrationOtp.findOne({ email });
    if (!pending) return res.status(400).json({ error: 'No active verification request was found. Please register again.' });
    if (pending.expiresAt <= new Date()) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return res.status(400).json({ error: 'This verification code has expired. Please register again.' });
    }
    if (pending.attempts >= 5) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return res.status(429).json({ error: 'Too many incorrect attempts. Please register again.' });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== pending.otpHash) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      emailVerified: true,
    });
    await RegistrationOtp.deleteOne({ _id: pending._id });

    return res.status(201).json({ token: signToken(user), user: user.toPublic(), message: 'Email verified and account created successfully.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('[Registration verification] Failed:', err);
    return res.status(500).json({ error: 'Could not verify the email. Please try again.' });
  }
});

router.post('/resend-registration-otp', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const pending = await RegistrationOtp.findOne({ email });
    if (!pending) return res.status(404).json({ error: 'No pending registration found. Please register again.' });
    if (!isEmailConfigured()) return res.status(503).json({ error: 'Verification email service is not configured.' });

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresMinutes = Number(process.env.REGISTRATION_OTP_EXPIRE_MINUTES) || 10;
    pending.otpHash = otpHash;
    pending.expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
    pending.attempts = 0;
    await pending.save();
    try {
      await sendRegistrationOtpEmail({ to: pending.email, name: pending.name, otp, expiresMinutes });
    } catch (mailErr) {
      console.error('[Registration verification] Resend failed:', mailErr.message);
      return res.status(502).json({ error: 'We could not send the verification email. Please try again later.' });
    }
    return res.json({ success: true, message: 'A new verification code has been sent.' });
  } catch (err) {
    console.error('[Registration verification] Resend request failed:', err);
    return res.status(500).json({ error: 'Could not resend the verification code.' });
  }
});

// ---- Login ---------------------------------------------------------
router.post('/login', authLimiter, verifyCaptcha, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});




// ---- Google Sign-In ----------------------------------------------------
// The browser receives a Google Identity Services ID token and sends it here.
// We verify the signature, issuer, audience, expiry and verified email with
// Google's official auth library before issuing our own DocumentAI JWT.
router.post('/google', authLimiter, async (req, res) => {
  try {
    const credential = String(req.body?.credential || '').trim();
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' });
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google Sign-In is not configured on the server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      return res.status(401).json({ error: 'Invalid Google identity token.' });
    }
    if (!payload.email || payload.email_verified !== true || !payload.sub) {
      return res.status(401).json({ error: 'Google could not verify this email address.' });
    }

    const email = payload.email.trim().toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = await User.create({
        name: payload.name || payload.given_name || email.split('@')[0],
        email,
        passwordHash: randomPassword,
        googleId: payload.sub,
        emailVerified: true,
        avatarUrl: payload.picture || null,
      });
    } else {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ error: 'This email is already linked to a different Google account.' });
      }
      // Secure account linking: Google has just verified ownership of this email.
      user.googleId = payload.sub;
      user.emailVerified = true;
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      if (!user.name && payload.name) user.name = payload.name;
      await user.save();
    }

    return res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    console.error('[Google Sign-In] Verification failed:', err.message);
    return res.status(401).json({ error: 'Google Sign-In failed. Please try again.' });
  }
});

// ---- Forgot password ---------------------------------------------------
// The response intentionally does not reveal whether an email exists.
router.post('/forgot-password', authLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const genericMessage = 'If an account exists for that email, a password reset link has been sent.';

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: genericMessage });

    if (!isEmailConfigured()) {
      console.error('[Password reset] Brevo email is not configured. Set BREVO_API_KEY and MAIL_FROM_EMAIL.');
      return res.status(503).json({ error: 'Password reset email service is not configured. Please contact the administrator.' });
    }

    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresMinutes = Number(process.env.PASSWORD_RESET_EXPIRE_MINUTES) || 30;
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresMinutes,
      });
    } catch (mailErr) {
      // Do not leave a live token behind if delivery fails.
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save().catch(() => {});
      console.error('[Password reset] Brevo API delivery failed:', mailErr.message);
      return res.status(502).json({ error: 'We could not send the password reset email. Please try again later.' });
    }

    return res.json({ success: true, message: genericMessage });
  } catch (err) {
    console.error('[Password reset] Request failed:', err);
    return res.status(500).json({ error: 'Unable to process the password reset request. Please try again later.' });
  }
});

// ---- Reset password ----------------------------------------------------
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be 8+ characters and include uppercase, lowercase, a number, and a special character.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.tokenVersion += 1;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    console.error('[Password reset] Reset failed:', err);
    return res.status(500).json({ error: 'Unable to reset your password. Please try again later.' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  // Stateless JWTs: a single logout is enforced client-side by discarding
  // the token. "Logout all sessions" (settings page) bumps tokenVersion,
  // which immediately invalidates every previously issued token.
  res.json({ success: true });
});

router.post('/logout-all', requireAuth, async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  res.json({ success: true, token: signToken(req.user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, theme, settings } = req.body || {};
  if (name) req.user.name = name.trim();
  if (theme) req.user.theme = theme;
  if (settings) req.user.settings = { ...(req.user.settings || {}), ...settings };
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const ok = await bcrypt.compare(currentPassword || '', req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
  if (!PASSWORD_RULE.test(newPassword || '')) {
    return res.status(400).json({ error: 'New password does not meet the requirements.' });
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  await req.user.save();
  res.json({ success: true });
});

module.exports = router;
