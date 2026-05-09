// Transactional email via SMTP (Gmail) or Resend.
// Priority: SMTP config → Resend API key → mailto: fallback.
// Usage: const result = await sendEmail(payload, smtpConfig)
//
// nodemailer is loaded via require() so the file compiles before pnpm install adds it.
// Run `pnpm install` after pulling to add nodemailer to node_modules.

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SmtpConfig {
  fromName: string;
  fromEmail: string;
  password: string; // Gmail App Password
}

export interface SendResult {
  sent: boolean;
  mailtoFallback?: string;
  error?: string;
}

function mailtoUrl(payload: EmailPayload): string {
  return `mailto:${encodeURIComponent(payload.to)}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.text)}`;
}

async function sendViaSMTP(payload: EmailPayload, smtp: SmtpConfig): Promise<SendResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const nodemailer = require("nodemailer") as any;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: smtp.fromEmail, pass: smtp.password },
    });
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${payload.text}</pre>`,
      replyTo: payload.replyTo ?? smtp.fromEmail,
    });
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
      mailtoFallback: mailtoUrl(payload),
    };
  }
}

async function sendViaResend(payload: EmailPayload, apiKey: string): Promise<SendResult> {
  const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@renotrack360.com";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${payload.text}</pre>`,
        reply_to: payload.replyTo,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { sent: false, error: `Resend error: ${err}`, mailtoFallback: mailtoUrl(payload) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Resend failed", mailtoFallback: mailtoUrl(payload) };
  }
}

export async function sendEmail(payload: EmailPayload, smtpConfig?: SmtpConfig | null): Promise<SendResult> {
  // 1. SMTP (contractor's own Gmail)
  if (smtpConfig?.fromEmail && smtpConfig?.password) {
    return sendViaSMTP(payload, smtpConfig);
  }
  // 2. Resend (platform transactional)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return sendViaResend(payload, resendKey);
  }
  // 3. mailto fallback
  return { sent: false, mailtoFallback: mailtoUrl(payload) };
}

// Helper used by server actions: returns null if sent, or the mailto URL to redirect to
export async function sendOrMailto(payload: EmailPayload, smtpConfig?: SmtpConfig | null): Promise<string | null> {
  const result = await sendEmail(payload, smtpConfig);
  if (result.sent) return null;
  return result.mailtoFallback ?? null;
}
