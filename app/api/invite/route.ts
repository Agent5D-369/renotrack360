import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-sender";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as Record<string, unknown>).organizationId as string | null;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } }
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
  }

  const { email, role } = await request.json().catch(() => ({})) as { email?: string; role?: string };
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.inviteToken.create({
    data: {
      email: normalizedEmail,
      organizationId: orgId,
      role: (role as never) ?? "ADMIN",
      token,
      expiresAt,
      invitedByUserId: session.user.id
    }
  });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3010";
  const inviteUrl = `${appUrl}/accept-invite/${token}`;

  await sendEmail({
    to: normalizedEmail,
    subject: `You're invited to ${org?.name ?? "RenoTrack360"}`,
    text: `${session.user.name ?? "Someone"} invited you to join ${org?.name ?? "RenoTrack360"} on RenoTrack360.\n\nAccept your invite:\n${inviteUrl}\n\nThis link expires in 7 days.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#183d29">You're invited to ${org?.name ?? "RenoTrack360"}</h2>
        <p>${session.user.name ?? "A team member"} invited you to join their renovation operations platform.</p>
        <p style="margin:24px 0">
          <a href="${inviteUrl}" style="background:#183d29;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Accept invitation
          </a>
        </p>
        <p style="color:#666;font-size:13px">This invite expires in 7 days.</p>
      </div>
    `
  });

  return NextResponse.json({ ok: true });
}
