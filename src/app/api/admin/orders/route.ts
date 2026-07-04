import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { desc } from "drizzle-orm";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [os, items] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200),
    db.select().from(orderItems),
  ]);
  return NextResponse.json(os.map((o) => ({
    ...o, items: items.filter((i) => i.orderId === o.id),
  })));
}
