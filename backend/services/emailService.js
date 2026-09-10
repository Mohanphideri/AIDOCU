const SibApiV3Sdk = require('sib-api-v3-sdk');
const { env } = require('../config/env');
const { EmailLog } = require('../models');

let transactionalEmailsApi = null;

function getBrevoClient() {
  if (transactionalEmailsApi) return transactionalEmailsApi;

  const client = SibApiV3Sdk.ApiClient.instance;
  const apiKeyAuth = client.authentications['api-key'];
  apiKeyAuth.apiKey = env.BREVO_API_KEY;

  transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
  return transactionalEmailsApi;
}

/**
 * Sends a transactional email via Brevo and writes an EmailLog entry
 * regardless of success/failure. This is the ONLY module that should call
 * the Brevo SDK directly — everything else goes through the functions below.
 */
async function sendEmail({ to, subject, htmlContent, type, studentId = null, examId = null, resultId = null }) {
  const log = await EmailLog.create({
    recipient: to,
    studentId,
    type,
    examId,
    resultId,
    status: 'QUEUED',
  });

  if (!env.BREVO_API_KEY) {
    // Local/dev fallback: don't crash the flow if Brevo isn't configured yet.
    console.warn(`[emailService] BREVO_API_KEY not set — skipping send to ${to} (type=${type})`);
    log.status = 'FAILED';
    log.failureReason = 'BREVO_API_KEY not configured';
    await log.save();
    return log;
  }

  try {
    const api = getBrevoClient();
    const payload = {
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    const response = await api.sendTransacEmail(payload);

    log.status = 'SENT';
    log.sentAt = new Date();
    log.providerMessageId = response?.messageId || null;
    await log.save();
    return log;
  } catch (err) {
    log.status = 'FAILED';
    log.failureReason = err.message || 'Unknown Brevo error';
    await log.save();
    // Intentionally do not rethrow for result-publication emails — publication
    // must never be rolled back due to email failure. Callers that need to
    // know about failure should check the returned log's `status`.
    return log;
  }
}

async function sendVerificationEmail({ to, studentId, code, universityName }) {
  return sendEmail({
    to,
    type: 'VERIFICATION',
    studentId,
    subject: `${universityName} — Email Verification Code`,
    htmlContent: `
      <p>Your university account verification code is:</p>
      <h2>${code}</h2>
      <p>This code expires in ${env.VERIFICATION_CODE_EXPIRY_MINUTES} minutes. Do not share this code with anyone.</p>
    `,
  });
}

async function sendPasswordResetEmail({ to, studentId, resetUrl, universityName }) {
  return sendEmail({
    to,
    type: 'PASSWORD_RESET',
    studentId,
    subject: `${universityName} — Password Reset Request`,
    htmlContent: `
      <p>A password reset was requested for your university account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutes. If you did not request this, you can ignore this email.</p>
    `,
  });
}

async function sendResultPublicationEmail({ to, studentId, examId, resultId, examName, universityName, resultPortalUrl }) {
  return sendEmail({
    to,
    type: 'RESULT_PUBLICATION',
    studentId,
    examId,
    resultId,
    subject: `${universityName} — Result Published: ${examName}`,
    htmlContent: `
      <p>Your result for <strong>${examName}</strong> has been published.</p>
      <p><a href="${resultPortalUrl}">View your result</a></p>
      <p>You will need to log in with your UID and password to view it.</p>
    `,
  });
}

/**
 * Sent to eligible students the moment an exam goes ACTIVE — never before.
 * Exam creation and scheduling are deliberately silent; the exam isn't
 * actually joinable until it's ACTIVE, so notifying earlier would just
 * generate "why can't I start it yet" confusion/support load.
 */
async function sendExamActiveEmail({ to, studentId, examId, examName, universityName, startTime, endTime, durationMinutes, examPortalUrl }) {
  return sendEmail({
    to,
    type: 'EXAM_ACTIVE',
    studentId,
    examId,
    subject: `${universityName} — ${examName} is now live`,
    htmlContent: `
      <p><strong>${examName}</strong> is now open for you to take.</p>
      <p>
        Start: ${new Date(startTime).toLocaleString()}<br/>
        End: ${new Date(endTime).toLocaleString()}<br/>
        Duration: ${durationMinutes} minutes
      </p>
      <p><a href="${examPortalUrl}">Click here to go straight to this exam</a></p>
      <p>If you are not already logged in, this link will take you to login first and then send you straight into the exam automatically.</p>
      <p>Log in with your UID and password well before the end time — once the exam window closes you will not be able to start or resume it.</p>
    `,
  });
}

async function retryFailedEmail(emailLogId) {
  const log = await EmailLog.findById(emailLogId);
  if (!log || log.status !== 'FAILED') return null;
  // TODO: reconstruct the original email content based on `type` and retry,
  // incrementing retryCount. Left as an integration point once content
  // templates are finalized with the university.
  log.retryCount += 1;
  await log.save();
  return log;
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendResultPublicationEmail,
  sendExamActiveEmail,
  retryFailedEmail,
};
