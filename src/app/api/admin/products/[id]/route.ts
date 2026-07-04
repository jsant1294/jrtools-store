import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { images, ...data } = body;
  await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
  if (Array.isArray(images)) {
    await db.delete(productImages).where(eq(productImages.productId, id));
    if (images.length)
      await db.insert(productImages).values(images.map((img: { url: string }, i: number) => ({
        productId: id, url: img.url, position: i,
      })));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  // Soft delete: hide it. Order history keeps its references intact.
  await db.update(products).set({ stockStatus: "hidden" }).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
}
