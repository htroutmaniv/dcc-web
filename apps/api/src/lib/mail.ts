import { config } from './config.js';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(params: SendMailParams): Promise<void> {
  if (!config.resend.apiKey || !config.resend.from) {
    throw new Error('Email is not configured (RESEND_API_KEY / MAIL_FROM)');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resend.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}

export function verificationEmailHtml(verifyUrl: string): string {
  return `
    <p>Welcome to DCC Web.</p>
    <p><a href="${verifyUrl}">Verify your email address</a> to finish creating your account.</p>
    <p>This link expires in 24 hours. If you did not sign up, you can ignore this email.</p>
  `.trim();
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `
    <p>We received a request to reset your DCC Web password.</p>
    <p><a href="${resetUrl}">Choose a new password</a></p>
    <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
  `.trim();
}
