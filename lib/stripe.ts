import Stripe from "stripe";

export async function createStripePaymentLink(input: {
  amount: number;
  invoiceNumber: string;
  clientEmail?: string;
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return "Stripe is not configured. Add STRIPE_SECRET_KEY to create live payment links.";
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia"
  });
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
