// ============================================================
// "Customers who bought this also purchased" — two-stage engine.
// Stage 1 (day one): smart heuristic. Stage 2 (auto): real co-purchase
// data takes over as orders accumulate. The modal never knows the difference.
// ============================================================
import { db } from "@/db";
import { products, coPurchases } from "@/db/schema";
import { and, eq, ne, gte, lte, desc, inArray, notInArray, sql } from "drizzle-orm";

const SLOTS = 4;
const MIN_COPURCHASE_COUNT = 2; // require a repeated pair before trusting real data

export async function getRelatedProducts(productId: string) {
  const [target] = await db.select().from(products).where(eq(products.id, productId));
  if (!target) return [];

  // ---- Stage 2: real co-purchase pairs, if we have signal ----
  const pairs = await db
    .select()
    .from(coPurchases)
    .where(and(eq(coPurchases.productA, productId), gte(coPurchases.count, MIN_COPURCHASE_COUNT)))
    .orderBy(desc(coPurchases.count))
    .limit(SLOTS);

  const realIds = pairs.map((p) => p.productB);
  const real = realIds.length
    ? await db.select().from(products).where(
        and(inArray(products.id, realIds), eq(products.stockStatus, "in_stock")),
      )
    : [];

  if (real.length >= SLOTS) return real.slice(0, SLOTS);

  // ---- Stage 1: heuristic fill — same category first (accessory logic),
  // then same brand within a price band (ecosystem logic: M18 buyer sees M18 gear) ----
  const excluded = [productId, ...real.map((r) => r.id)];
  const priceLow = Math.floor(target.priceCents * 0.3);
  const priceHigh = Math.ceil(target.priceCents * 2.5);

  const sameCategory = target.categoryId
    ? await db.select().from(products).where(and(
        eq(products.categoryId, target.categoryId),
        eq(products.stockStatus, "in_stock"),
        notInArray(products.id, excluded),
        ne(products.id, productId),
      )).limit(SLOTS)
    : [];

  const pool = [...real, ...sameCategory];
  if (pool.length >= SLOTS) return pool.slice(0, SLOTS);

  const sameBrand = target.brandId
    ? await db.select().from(products).where(and(
        eq(products.brandId, target.brandId),
        eq(products.stockStatus, "in_stock"),
        gte(products.priceCents, priceLow),
        lte(products.priceCents, priceHigh),
        notInArray(products.id, [...excluded, ...sameCategory.map((p) => p.id)]),
      )).limit(SLOTS)
    : [];

  return [...pool, ...sameBrand].slice(0, SLOTS);
}

// Called from the order-completion webhook/route: increments pair counts
// so Stage 2 grows itself from real sales. Fire-and-forget.
export async function recordCoPurchases(productIds: string[]) {
  const unique = [...new Set(productIds)];
  for (let i = 0; i < unique.length; i++) {
    for (let j = 0; j < unique.length; j++) {
      if (i === j) continue;
      await db
        .insert(coPurchases)
        .values({ productA: unique[i], productB: unique[j], count: 1 })
        .onConflictDoUpdate({
          target: [coPurchases.productA, coPurchases.productB],
          set: { count: sql`${coPurchases.count} + 1` },
        });
    }
  }
}
