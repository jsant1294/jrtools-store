import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { createPayPalOrder } from "@/lib/paypal";
import { getPaymentConfig } from "@/lib/paymentSettings";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { paypal: paypalConfig } = await getPaymentConfig();
  if (!paypalConfig.enabled || !paypalConfig.clientId || !paypalConfig.clientSecret) {
    return NextResponse.json({ error: "paypal not enabled" }, { status: 503 });
  }

  const { orderId } = await req.json();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.status !== "pending_payment" || order.paymentMethod !== "paypal") {
    return NextResponse.json({ error: "order not payable" }, { status: 409 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const paypal = await createPayPalOrder({
    credentials: { clientId: paypalConfig.clientId, clientSecret: paypalConfig.clientSecret, env: paypalConfig.env },
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalCents: order.totalCents,
    locale: order.locale,
    origin,
  });

  await db.update(orders)
    .set({ paypalOrderId: paypal.paypalOrderId })
    .where(eq(orders.id, order.id));

  return NextResponse.json({ url: paypal.approveUrl });
}
