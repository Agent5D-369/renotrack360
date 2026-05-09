import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, type PlanKey } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, billing } = await request.json().catch(() => ({})) as { plan?: string; billing?: string };
  if (!plan || !billing) return NextResponse.json({ error: "plan and billing required" }, { status: 400 });

  const orgId = (session.user as Record<string, unknown>).organizationId as string | null;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3010";
  try {
    const url = await createCheckoutSession({
      orgId,
      email: session.user.email!,
      orgName: org.name,
      plan: plan as PlanKey,
      billing: billing as "monthly" | "annual",
      successUrl: `${appUrl}/home?billing=success`,
      cancelUrl: `${appUrl}/pricing`
    });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
