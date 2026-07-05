import { NextResponse } from "next/server";
import { db } from "@/db";
import { brands, categories } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { getAiConfig } from "@/lib/aiSettings";
import { asc } from "drizzle-orm";
import { z } from "zod";

// Fills a new product's fields from just a tool name — description, specs,
// best-guess brand/category match against this store's real catalog, and a
// suggested (never auto-applied) resale price. The admin still reviews and
// saves manually; nothing here writes to the database.
const RequestInput = z.object({ query: z.string().trim().min(2).max(140) });

const AiOutput = z.object({
  nameEn: z.string().min(1),
  nameEs: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionEs: z.string().min(1),
  specs: z.record(z.string()).default({}),
  brandSlug: z.string().nullable().default(null),
  categorySlug: z.string().nullable().default(null),
  condition: z.enum(["new", "open_box", "refurbished", "used"]).default("used"),
  suggestedPriceCents: z.number().int().min(0).max(500000).nullable().default(null),
});

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = RequestInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const aiConfig = await getAiConfig();
  if (!aiConfig.enabled || !aiConfig.apiKey) {
    return NextResponse.json({ error: "AI is not configured. Set it up in Admin > AI Assistant." }, { status: 503 });
  }

  const [brandRows, categoryRows] = await Promise.all([
    db.select({ slug: brands.slug, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder)),
    db.select({ slug: categories.slug, nameEn: categories.nameEn }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);

  const brandList = brandRows.map((b) => `${b.slug} (${b.name})`).join(", ") || "none configured";
  const categoryList = categoryRows.map((c) => `${c.slug} (${c.nameEn})`).join(", ") || "none configured";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": aiConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: `You help a tool resale store fill out a product listing from a short name/model. Respond with ONLY a single JSON object, no markdown, no commentary, matching exactly this shape:
{"nameEn": string, "nameEs": string, "descriptionEn": string, "descriptionEs": string, "specs": {string: string}, "brandSlug": string|null, "categorySlug": string|null, "condition": "new"|"open_box"|"refurbished"|"used", "suggestedPriceCents": number|null}

Rules:
- nameEn/nameEs: clean, accurate product name (translate naturally, don't transliterate brand names).
- descriptionEn/descriptionEs: 2-3 honest sentences a reseller would use, no invented features.
- specs: only real, well-known specs for this exact tool (voltage, chuck size, etc.) as short key/value pairs. Empty object if unsure.
- brandSlug: pick the closest match from this store's real brands: ${brandList}. Use null if none fit — never invent a new brand slug.
- categorySlug: pick the closest match from this store's real categories: ${categoryList}. Use null if none fit — never invent a new category slug.
- condition: guess from the query text (e.g. "open box", "used") — default "used" if not stated.
- suggestedPriceCents: a reasonable US resale estimate in cents for this condition, or null if you genuinely don't know. This is a suggestion a human will review, never state it as certain.`,
      messages: [{ role: "user", content: parsed.data.query }],
    }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  const data = await resp.json();
  const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

  let output: z.infer<typeof AiOutput>;
  try {
    output = AiOutput.parse(extractJson(text));
  } catch {
    return NextResponse.json({ error: "AI returned an unexpected response. Try rephrasing the tool name." }, { status: 502 });
  }

  const brandMatch = brandRows.find((b) => b.slug === output.brandSlug);
  const categoryMatch = categoryRows.find((c) => c.slug === output.categorySlug);

  return NextResponse.json({
    nameEn: output.nameEn,
    nameEs: output.nameEs,
    descriptionEn: output.descriptionEn,
    descriptionEs: output.descriptionEs,
    specs: output.specs,
    brandSlug: brandMatch?.slug ?? null,
    categorySlug: categoryMatch?.slug ?? null,
    condition: output.condition,
    suggestedPriceCents: output.suggestedPriceCents,
  });
}
