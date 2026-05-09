import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-sender";

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Always return 200 to prevent user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({ data: { email: normalized, token, expiresAt } });

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3010";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: normalized,
    subject: "Reset your RenoTrack360 password",
    text: `You requested a password reset.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#183d29">Reset your password</h2>
        <p>You requested a password reset for your RenoTrack360 account.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#183d29;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Set new password
          </a>
        </p>
        <p style="color:#666;font-size:13px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
      </div>
    `
  });

  return NextResponse.json({ ok: true });
}
