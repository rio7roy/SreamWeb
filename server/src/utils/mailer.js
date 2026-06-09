const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends an invitation email to a newly created Expert or Admin.
 * @param {string} email - The recipient's email address
 * @param {string} name - The recipient's full name
 * @param {string} inviteLink - The unique onboarding URL
 */
exports.sendInvite = async (email, name, inviteLink) => {
  // If SMTP is not configured, we'll just log it so the system doesn't crash during testing
  if (!process.env.SMTP_USER) {
    console.warn(`[MAILER] SMTP not configured. Simulated invite for ${email}: ${inviteLink}`);
    return;
  }

  const transporter = createTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 12px;">
      <h2 style="color: #1a1a1a;">Welcome to STREAM, ${name}!</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
        You have been invited to join the STREAM Ecosystem platform. To complete your registration and activate your account, please click the button below:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #0056b3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
          Complete Onboarding
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px;">
        If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${inviteLink}" style="color: #0056b3;">${inviteLink}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eaeaeb; margin: 20px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
        &copy; ${new Date().getFullYear()} STREAM Ecosystem. All rights reserved.
      </p>
    </div>
  `;

  try {
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
    await transporter.sendMail({
      from: `"STREAM Administration" <${fromEmail}>`,
      to: email,
      subject: 'You have been invited to STREAM Ecosystem',
      html: htmlContent,
    });
    console.log(`[MAILER] Invite sent to ${email}`);
  } catch (error) {
    console.error(`[MAILER] Failed to send invite to ${email}:`, error);
    throw new Error('Failed to send email');
  }
};
