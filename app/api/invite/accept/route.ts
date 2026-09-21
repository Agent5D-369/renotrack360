import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acceptStaffInvite, inviteAcceptanceInput, InviteAcceptanceError } from "@/lib/invite-acceptance";

export async function POST(request: Request) {
  const parsed = inviteAcceptanceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid invitation, name and password of at least 12 characters (at most 72 UTF-8 bytes)." }, { status: 400 });
  try {
    await acceptStaffInvite(prisma, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InviteAcceptanceError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[invite-accept] failed");
    return NextResponse.json({ error: "Unable to accept this invitation." }, { status: 500 });
  }
}
