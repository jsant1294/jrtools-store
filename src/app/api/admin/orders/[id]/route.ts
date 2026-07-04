import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";

const FLOW = ["pending_payment", "paid", "ready_for_pickup", "shipped", "completed", "cancelled"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status, adminNotes } = await req.json();
  if (status && !FLOW.includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  await db.update(orders).set({
    ...(status ? { status } : {}), ...(adminNotes !== undefined ? { adminNotes } : {}),
  }).where(eq(orders.id, id));
  return NextResponse.json({ ok: true });
}
