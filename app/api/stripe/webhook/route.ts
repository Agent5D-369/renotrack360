import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export const config = { api: { bodyParser: false } };

function planTierFromProduct(product: string | Stripe.Product | null): string {
  if (!product) return "PRO";
  const name = typeof product === "string" ? product : (product.name ?? "");
  const n = name.toLowerCase();
  if (n.includes("command")) return "COMMAND_CENTER";
  if (n.includes("starter")) return "STARTER";
  return "PRO";
}

async function updateSubscription(stripeSubscription: Stripe.Subscription) {
  const orgId = stripeSubscription.metadata?.orgId;
  if (!orgId) return;

  const item = stripeSubscription.items.data[0];
  const price = item?.price;
  const productId = price?.product ?? null;
  let product: Stripe.Product | null = null;
  const stripe = getStripeClient();
  if (stripe && productId && typeof productId === "string") {
    product = await stripe.products.retrieve(productId);
  }

  const planTier = planTierFromProduct(product);
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    unpaid: "UNPAID",
    paused: "PAST_DUE"
  };

  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      planTier: planTier as never,
      status: (statusMap[stripeSubscription.status] ?? "ACTIVE") as never,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
    },
    create: {
      organizationId: orgId,
      stripeSubscriptionId: stripeSubscription.id,
      planTier: planTier as never,
      status: (statusMap[stripeSubscription.status] ?? "ACTIVE") as never,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      activeJobLimit: planTier === "STARTER" ? 5 : planTier === "PRO" ? 20 : 999,
      monthlyEstimateLimit: planTier === "STARTER" ? 30 : planTier === "PRO" ? 150 : 999,
      userLimit: planTier === "STARTER" ? 2 : planTier === "PRO" ? 5 : 10
    }
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.metadata?.orgId) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await updateSubscription(sub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateSubscription(sub);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription ? String(invoice.subscription) : null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          await prisma.subscription.updateMany({
            where: { organizationId: orgId },
            data: { status: "PAST_DUE" }
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
