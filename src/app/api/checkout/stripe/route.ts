// Stripe Checkout — creates the order as pending_payment, opens a Stripe
// Checkout Session, and the webhook marks it paid. Credentials come from the
// admin-configured Payments settings, not env vars.
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentConfig } from "@/lib/paymentSettings";

export async function POST(req: Request) {
  const { stripe: stripeConfig } = await getPaymentConfig();
  if (!stripeConfig.enabled || !stripeConfig.secretKey)
    return NextResponse.json({ error: "card payments not enabled" }, { status: 503 });

  const stripe = new Stripe(stripeConfig.secretKey);
  const { orderId } = await req.json();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.status !== "pending_payment")
    return NextResponse.json({ error: "order not payable" }, { status: 409 });

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `JR Tools USA — ${order.orderNumber}` },
        unit_amount: order.totalCents,
      },
      quantity: 1,
    }],
    metadata: { orderId: order.id },
    success_url: `${origin}/${order.locale}/checkout?paid=${order.orderNumber}`,
    cancel_url: `${origin}/${order.locale}/checkout`,
  });

  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));
  return NextResponse.json({ url: session.url });
}
