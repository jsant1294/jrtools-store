import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productImages, brands, categories } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { z } from "zod";
import { asc, desc } from "drizzle-orm";

const ProductInput = z.object({
  sku: z.string().min(3), slug: z.string().min(3),
  nameEn: z.string().min(2), nameEs: z.string().min(2),
  descriptionEn: z.string().optional(), descriptionEs: z.string().optional(),
  brandId: z.string().uuid().nullable(), categoryId: z.string().uuid().nullable(),
  priceCents: z.number().int().min(0), compareAtCents: z.number().int().nullable().optional(),
  condition: z.enum(["new", "open_box", "refurbished", "used"]),
  stockStatus: z.enum(["in_stock", "pickup_only", "out_of_stock", "hidden"]),
  quantity: z.number().int().min(0), allowShipping: z.boolean(),
  specs: z.record(z.string()).optional(),
  images: z.array(z.object({ url: z.string().url() })).max(4),
});
export type ProductInputT = z.infer<typeof ProductInput>;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [rows, imgs, bs, cs] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(productImages),
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  return NextResponse.json({ products: rows.map((p) => ({
    ...p, images: imgs.filter((i) => i.productId === p.id).sort((a, b) => a.position - b.position),
  })), brands: bs, categories: cs });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = ProductInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { images, ...data } = parsed.data;
  const [p] = await db.insert(products).values(data).returning();
  if (images.length)
    await db.insert(productImages).values(images.map((img, i) => ({
      productId: p.id, url: img.url, position: i,
    })));
  return NextResponse.json({ id: p.id });
}
