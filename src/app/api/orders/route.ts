import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { recordCoPurchases } from "@/lib/related";
import { eq, sql, inArray } from "drizzle-orm";

const OrderSchema = z.object({
  fulfillment: z.enum(["pickup", "shipping"]),
  paymentMethod: z.enum(["stripe", "paypal", "zelle", "cash_app", "cash_pickup"]),
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  customerEmail: z.string().email().optional().or(z.literal("")),
  locale: z.string().default("en"),
  shipAddress: z.object({
    line1: z.string().min(3), line2: z.string().optional(),
    city: z.string().min(2), state: z.string().length(2), zip: z.string().min(5),
  }).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1) })).min(1),
});

export async function POST(req: Request) {
  const parsed = OrderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const o = parsed.data;

  if (o.fulfillment === "shipping" && !o.shipAddress)
    return NextResponse.json({ error: "shipping address required" }, { status: 400 });

  // Server-side price validation — never trust the client's cents
  const ids = o.items.map((i) => i.productId);
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const item of o.items) {
    const p = byId.get(item.productId);
    if (!p || (p.stockStatus !== "in_stock" && p.stockStatus !== "pickup_only"))
      return NextResponse.json({ error: `unavailable: ${item.productId}` }, { status: 409 });
    if ((p.quantity ?? 0) < item.qty)
      return NextResponse.json({ error: `insufficient stock: ${p.sku}` }, { status: 409 });
    if (o.fulfillment === "shipping" && (p.stockStatus === "pickup_only" || !p.allowShipping))
      return NextResponse.json({ error: `pickup only: ${p.sku}` }, { status: 409 });
  }

  const subtotal = o.items.reduce((s, i) => s + byId.get(i.productId)!.priceCents * i.qty, 0);
  const shipping = o.fulfillment === "shipping" ? 1500 : 0; // flat $15 v1 — weight-based later
  const total = subtotal + shipping;

  const orderNumber = `JR-${Date.now().toString().slice(-8)}`;
  const [created] = await db.insert(orders).values({
    orderNumber, fulfillment: o.fulfillment, paymentMethod: o.paymentMethod,
    customerName: o.customerName, customerPhone: o.customerPhone,
    customerEmail: o.customerEmail || null, locale: o.locale,
    shipAddress: o.shipAddress ?? null,
    subtotalCents: subtotal, shippingCents: shipping, taxCents: 0, totalCents: total,
    status: "pending_payment",
  }).returning();

  await db.insert(orderItems).values(o.items.map((i) => ({
    orderId: created.id, productId: i.productId, qty: i.qty,
    unitPriceCents: byId.get(i.productId)!.priceCents,
    nameSnapshot: byId.get(i.productId)!.nameEn,
  })));

  // Decrement stock
  for (const i of o.items) {
    await db.update(products)
      .set({ quantity: sql`${products.quantity} - ${i.qty}` })
      .where(eq(products.id, i.productId));
  }

  // Feed the recommendation engine (multi-item orders only)
  if (ids.length > 1) recordCoPurchases(ids).catch(() => {});

  return NextResponse.json({ id: created.id, orderNumber: created.orderNumber, totalCents: total });
}
