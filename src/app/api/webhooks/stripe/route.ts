import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentConfig } from "@/lib/paymentSettings";

export async function POST(req: Request) {
  const { stripe: stripeConfig } = await getPaymentConfig();
  if (!stripeConfig.enabled || !stripeConfig.secretKey || !stripeConfig.webhookSecret)
    return NextResponse.json({ ok: true }); // dark: acknowledge, do nothing

  const stripe = new Stripe(stripeConfig.secretKey);
  const sig = req.headers.get("stripe-signature")!;
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, stripeConfig.webhookSecret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId)
      await db.update(orders).set({ status: "paid" }).where(eq(orders.id, orderId));
  }
  return NextResponse.json({ received: true });
}
