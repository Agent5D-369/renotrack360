
import { staffApiDenial } from "@/lib/staff-access";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as Record<string, unknown>).organizationId as string | null;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: "No billing account found" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3010";
  const url = await createBillingPortalSession(sub.stripeCustomerId, `${appUrl}/settings`);
  return NextResponse.json({ url });
}
