import { NextResponse } from "next/server";
import { getRelatedProducts } from "@/lib/related";
import { db } from "@/db";
import { productImages } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const related = await getRelatedProducts(id);
  const imgs = related.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, related.map((r) => r.id)))
    : [];
  return NextResponse.json(related.map((r) => ({
    id: r.id, slug: r.slug,
    name: r.nameEn, // locale handled client-side in Phase 3; EN fallback for now
    priceCents: r.priceCents,
    imageUrl: imgs.filter((i) => i.productId === r.id).sort((a, b) => a.position - b.position)[0]?.url ?? null,
  })));
}
