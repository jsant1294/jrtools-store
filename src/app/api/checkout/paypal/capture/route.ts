import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { capturePayPalOrder } from "@/lib/paypal";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  const paypalOrderId = url.searchParams.get("token");

  if (!orderId || !paypalOrderId) {
    return NextResponse.redirect(new URL("/en/checkout?paypal=failed", url.origin));
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.paymentMethod !== "paypal") {
    return NextResponse.redirect(new URL("/en/checkout?paypal=failed", url.origin));
  }

  try {
    const captured = await capturePayPalOrder(paypalOrderId);
    await db.update(orders).set({
      status: "paid",
      paypalOrderId,
      paypalCaptureId: captured.captureId,
    }).where(eq(orders.id, order.id));

    return NextResponse.redirect(
      new URL(`/${order.locale ?? "en"}/checkout?paid=${order.orderNumber}`, url.origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/${order.locale ?? "en"}/checkout?paypal=failed`, url.origin),
    );
  }
}
