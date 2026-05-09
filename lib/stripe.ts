import Stripe from "stripe";

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
}

export const PLAN_CONFIG = {
  STARTER: {
    label: "Starter",
    monthlyPrice: 149_00,
    annualPrice: 1_500_00,
    users: 2,
    jobs: 5,
    estimates: 30,
    features: ["CRM + leads + contacts", "Mobile quote wizard", "Estimates & invoices", "Basic job phases", "Change orders", "PDF exports"]
  },
  PRO: {
    label: "Pro",
    monthlyPrice: 349_00,
    annualPrice: 3_500_00,
    foundingAnnualPrice: 2_500_00,
    users: 5,
    jobs: 20,
    estimates: 150,
    features: ["Everything in Starter", "Cost catalog + service templates", "Renovation workflow engine", "Selections tracking", "2-minute client reports", "Profit leak dashboard", "AI-assisted estimate review", "AI drafts + follow-up sequences"]
  },
  COMMAND_CENTER: {
    label: "Command Center",
    monthlyPrice: 699_00,
    annualPrice: 7_000_00,
    users: 10,
    jobs: 999,
    estimates: 999,
    features: ["Everything in Pro", "Advanced permissions", "Multi-project watchlists", "Subcontractor compliance tracking", "Advanced profitability dashboards", "Investor reporting", "Advanced AI risk detection", "Priority support"]
  }
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export function getPriceId(plan: PlanKey, billing: "monthly" | "annual"): string | null {
  const map: Record<string, string | undefined> = {
    STARTER_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    STARTER_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    PRO_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    PRO_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    COMMAND_CENTER_monthly: process.env.STRIPE_PRICE_COMMAND_MONTHLY,
    COMMAND_CENTER_annual: process.env.STRIPE_PRICE_COMMAND_ANNUAL
  };
  return map[`${plan}_${billing}`] ?? null;
}

export async function getOrCreateStripeCustomer(orgId: string, email: string, name: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe not configured");

  const { prisma } = await import("@/lib/prisma");
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });

  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await stripe.customers.create({ email, name, metadata: { orgId } });
  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: { stripeCustomerId: customer.id },
    create: {
      organizationId: orgId,
      stripeCustomerId: customer.id,
      planTier: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
      activeJobLimit: 25,
      monthlyEstimateLimit: 250,
      userLimit: 5
    }
  });
  return customer.id;
}

export async function createCheckoutSession(input: {
  orgId: string;
  email: string;
  orgName: string;
  plan: PlanKey;
  billing: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe not configured");

  const priceId = getPriceId(input.plan, input.billing);
  if (!priceId) throw new Error(`Price ID not configured for ${input.plan} ${input.billing}`);

  const customerId = await getOrCreateStripeCustomer(input.orgId, input.email, input.orgName);

  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (input.plan === "PRO" && input.billing === "annual" && process.env.STRIPE_COUPON_FOUNDING) {
    discounts.push({ coupon: process.env.STRIPE_COUPON_FOUNDING });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    discounts: discounts.length > 0 ? discounts : undefined,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { orgId: input.orgId, plan: input.plan, billing: input.billing },
    subscription_data: {
      trial_period_days: 14,
      metadata: { orgId: input.orgId }
    },
    allow_promotion_codes: true
  });
  return session.url!;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  return session.url;
}

// Backwards-compatible invoice payment link
export async function createStripePaymentLink(input: {
  amount: number;
  invoiceNumber: string;
  clientEmail?: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    return "Stripe is not configured. Add STRIPE_SECRET_KEY to create live payment links.";
  }
  const cents = Math.round(input.amount * 100);
  const price = await stripe.prices.create({
    currency: process.env.STRIPE_CURRENCY ?? "usd",
    unit_amount: cents,
    product_data: { name: `Invoice ${input.invoiceNumber}` }
  });
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: { type: "hosted_confirmation" },
    metadata: { invoiceNumber: input.invoiceNumber }
  });
  return link.url;
}
