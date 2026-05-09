import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { token, name, password } = await request.json().catch(() => ({})) as {
    token?: string; name?: string; password?: string;
  };

  if (!token || !name || !password) {
    return NextResponse.json({ error: "token, name, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });

  await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { name, passwordHash, organizationId: invite.organizationId } })
      : await tx.user.create({
          data: {
            email: invite.email,
            name,
            passwordHash,
            role: invite.role,
            organizationId: invite.organizationId
          }
        });

    await tx.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
      update: { role: invite.role, status: "ACTIVE", acceptedAt: new Date() },
      create: { userId: user.id, organizationId: invite.organizationId, role: invite.role, status: "ACTIVE", acceptedAt: new Date() }
    });

    await tx.inviteToken.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}
