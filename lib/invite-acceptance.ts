import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { DEFAULT_ORG_ID } from "./constants";
import { hasStaffAccess } from "./staff-policy";

export const inviteAcceptanceInput = z.object({
  token: z.string().min(32).max(256),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(12).refine(value => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes."),
});

export class InviteAcceptanceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function acceptStaffInvite(db: PrismaClient, input: z.infer<typeof inviteAcceptanceInput>) {
  const parsed = inviteAcceptanceInput.parse(input);
  // Reject unguessable-but-invalid tokens before doing expensive password hashing.
  // The transaction rechecks everything before consuming the token.
  const preview = await db.inviteToken.findUnique({ where: { token: parsed.token } });
  if (!preview || preview.acceptedAt || preview.expiresAt <= new Date()
      || preview.organizationId !== DEFAULT_ORG_ID || !["OWNER", "ADMIN"].includes(preview.role)) {
    throw new InviteAcceptanceError("This invitation is invalid, expired or no longer available.");
  }
  const passwordHash = await bcrypt.hash(parsed.password, 12);
  try {
    return await db.$transaction(async tx => {
      const now = new Date();
      const invite = await tx.inviteToken.findUnique({ where: { token: parsed.token } });
      if (!invite || invite.acceptedAt || invite.expiresAt <= now
          || invite.organizationId !== DEFAULT_ORG_ID || !["OWNER", "ADMIN"].includes(invite.role)) {
        throw new InviteAcceptanceError("This invitation is invalid, expired or no longer available.");
      }
      const inviter = invite.invitedByUserId ? await tx.user.findUnique({
        where: { id: invite.invitedByUserId },
        include: { memberships: { where: { organizationId: DEFAULT_ORG_ID } } },
      }) : null;
      const membership = inviter?.memberships[0] ?? null;
      if (!hasStaffAccess(inviter, membership) || (invite.role === "OWNER" && membership?.role !== "OWNER")) {
        throw new InviteAcceptanceError("The invitation must be reissued by an authorized owner or administrator.");
      }
      const existing = await tx.user.findUnique({ where: { email: invite.email } });
      if (existing) throw new InviteAcceptanceError(
        "An account already exists for this email. Sign in to that account and ask the owner to manage its membership; this link cannot reset it.", 409);

      const claimed = await tx.inviteToken.updateMany({
        where: { id: invite.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) throw new InviteAcceptanceError("This invitation has already been used.", 409);
      const user = await tx.user.create({ data: {
        email: invite.email, name: parsed.name, passwordHash, role: invite.role,
        organizationId: invite.organizationId,
        memberships: { create: { organizationId: invite.organizationId, role: invite.role,
          status: "ACTIVE", acceptedAt: now } },
      } });
      return { userId: user.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      throw new InviteAcceptanceError("This invitation or account was changed by another request. Please sign in or ask the owner for help.", 409);
    }
    throw error;
  }
}
