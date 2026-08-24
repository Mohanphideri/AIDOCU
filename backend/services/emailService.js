const https = require('https');

function isConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.MAIL_FROM_EMAIL
  );
}

function brevoRequest(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = responseBody ? JSON.parse(responseBody) : null; } catch (_) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          return resolve(parsed || {});
        }

        const message = parsed?.message || responseBody || `Brevo API returned HTTP ${res.statusCode}`;
        const error = new Error(message);
        error.statusCode = res.statusCode;
        reject(error);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Brevo API request timed out.'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendPasswordResetEmail({ to, name, resetUrl, expiresMinutes }) {
  if (!isConfigured()) {
    throw new Error('Brevo API email configuration is incomplete. Set BREVO_API_KEY and MAIL_FROM_EMAIL.');
  }

  const fromName = process.env.MAIL_FROM_NAME || 'DocumentAI';
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Reset your DocumentAI password';

  const text = [
    `Hello ${name || 'there'},`,
    '',
    'We received a request to reset your DocumentAI password.',
    '',
    `Reset your password: ${resetUrl}`,
    '',
    `This link expires in ${expiresMinutes} minutes and can only be used once.`,
    '',
    "If you didn't request a password reset, you can safely ignore this email.",
    '',
    '— DocumentAI Team',
  ].join('\n');

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f7f8fc;font-family:Inter,Arial,sans-serif;color:#172033;">
    <div style="max-width:600px;margin:40px auto;padding:0 16px;">
      <div style="background:#ffffff;border:1px solid #e8eaf2;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(20,24,40,.06);">
        <div style="padding:28px 32px;background:#18181f;color:#ffffff;">
          <div style="font-size:20px;font-weight:700;">DocumentAI</div>
          <div style="margin-top:8px;color:#b7bccb;font-size:13px;">Secure account recovery</div>
        </div>
        <div style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:24px;">Reset your password</h1>
          <p style="margin:0 0 20px;line-height:1.65;color:#5d6475;">Hello ${safeName}, we received a request to reset your DocumentAI password.</p>
          <a href="${safeUrl}" style="display:inline-block;background:#635bff;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;">Reset Password</a>
          <p style="margin:24px 0 0;line-height:1.6;color:#6b7280;font-size:13px;">This link expires in <strong>${expiresMinutes} minutes</strong> and can only be used once.</p>
          <p style="margin:14px 0 0;line-height:1.6;color:#6b7280;font-size:13px;">If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="margin:26px 0 0;color:#6b7280;font-size:13px;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break:break-all;color:#635bff;font-size:12px;">${safeUrl}</p>
        </div>
      </div>
      <p style="text-align:center;color:#9aa0ae;font-size:12px;margin:18px 0;">© ${new Date().getFullYear()} DocumentAI</p>
    </div>
  </body>
</html>`;

  return brevoRequest({
    sender: {
      name: fromName,
      email: process.env.MAIL_FROM_EMAIL,
    },
    to: [{ email: to, name: name || undefined }],
    subject,
    textContent: text,
    htmlContent: html,
  });
}


async function sendRegistrationOtpEmail({ to, name, otp, expiresMinutes = 10 }) {
  if (!isConfigured()) {
    throw new Error('Brevo API email configuration is incomplete. Set BREVO_API_KEY and MAIL_FROM_EMAIL.');
  }

  const fromName = process.env.MAIL_FROM_NAME || 'DocumentAI';
  const safeName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);
  const subject = 'Verify your DocumentAI account';
  const text = [
    `Hello ${name || 'there'},`,
    '',
    `Your DocumentAI verification code is: ${otp}`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    'If you did not create a DocumentAI account, you can ignore this email.',
    '',
    '— DocumentAI Team',
  ].join('\n');

  const html = `
<!doctype html>
<html><body style="margin:0;background:#f7f8fc;font-family:Inter,Arial,sans-serif;color:#172033;">
<div style="max-width:600px;margin:40px auto;padding:0 16px;">
<div style="background:#fff;border:1px solid #e8eaf2;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(20,24,40,.06);">
<div style="padding:28px 32px;background:#18181f;color:#fff;"><div style="font-size:20px;font-weight:700;">DocumentAI</div><div style="margin-top:8px;color:#b7bccb;font-size:13px;">Verify your new account</div></div>
<div style="padding:32px;">
<h1 style="margin:0 0 12px;font-size:24px;">Verify your email</h1>
<p style="margin:0 0 20px;line-height:1.65;color:#5d6475;">Hello ${safeName}, use the verification code below to finish creating your DocumentAI account.</p>
<div style="display:inline-block;background:#f1f0ff;border:1px solid #dedbff;border-radius:14px;padding:16px 24px;font-size:32px;letter-spacing:8px;font-weight:800;color:#635bff;">${safeOtp}</div>
<p style="margin:24px 0 0;line-height:1.6;color:#6b7280;font-size:13px;">This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
<p style="margin:14px 0 0;line-height:1.6;color:#6b7280;font-size:13px;">If you did not create a DocumentAI account, you can safely ignore this email.</p>
</div></div><p style="text-align:center;color:#9aa0ae;font-size:12px;margin:18px 0;">© ${new Date().getFullYear()} DocumentAI</p>
</div></body></html>`;

  return brevoRequest({
    sender: { name: fromName, email: process.env.MAIL_FROM_EMAIL },
    to: [{ email: to, name: name || undefined }],
    subject,
    textContent: text,
    htmlContent: html,
  });
}

module.exports = { sendPasswordResetEmail, sendRegistrationOtpEmail, isConfigured };
