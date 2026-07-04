import { NextResponse } from "next/server";
import { db } from "@/db";
import { brands, products } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const BrandInput = z.object({
  name: z.string().min(2).max(60),
  sortOrder: z.number().int().min(0).optional(),
});

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [rows, productRows] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    db.select({ brandId: products.brandId }).from(products),
  ]);
  const counts = new Map<string, number>();
  for (const row of productRows) {
    if (row.brandId) counts.set(row.brandId, (counts.get(row.brandId) ?? 0) + 1);
  }

  return NextResponse.json(rows.map((brand) => ({
    ...brand,
    productCount: counts.get(brand.id) ?? 0,
  })));
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = BrandInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const slug = slugify(parsed.data.name);
  const [brand] = await db.insert(brands).values({
    name: parsed.data.name.trim(),
    slug,
    sortOrder: parsed.data.sortOrder ?? 100,
  }).returning();

  return NextResponse.json(brand);
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(60),
    sortOrder: z.number().int().min(0),
  })).safeParse(body.brands);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  for (const brand of parsed.data) {
    await db.update(brands).set({
      name: brand.name.trim(),
      slug: slugify(brand.name),
      sortOrder: brand.sortOrder,
    }).where(eq(brands.id, brand.id));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ids = new URL(req.url).searchParams.getAll("id");
  const parsed = z.array(z.string().uuid()).min(1).safeParse(ids);
  if (!parsed.success) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const linked = await db.select({ brandId: products.brandId }).from(products)
    .where(inArray(products.brandId, parsed.data));
  if (linked.length > 0) {
    return NextResponse.json({ error: "brand has products" }, { status: 409 });
  }

  await db.delete(brands).where(inArray(brands.id, parsed.data));
  return NextResponse.json({ ok: true });
}
