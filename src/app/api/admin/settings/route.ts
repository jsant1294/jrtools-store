import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { FONT_PRESETS, getStoreSettings, THEME_PRESETS } from "@/lib/storeSettings";
import { sql } from "drizzle-orm";
import { z } from "zod";

const SettingsInput = z.object({
  heroImageUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  storeName: z.string().min(2).max(80),
  themePreset: z.enum(THEME_PRESETS),
  fontPreset: z.enum(FONT_PRESETS),
  hero: z.object({
    en: z.object({
      eyebrow: z.string().min(2).max(120),
      title: z.string().min(2).max(160),
      subtitle: z.string().min(2).max(280),
      cta: z.string().min(2).max(80),
      promoTitle: z.string().min(2).max(120),
      promoBody: z.string().min(2).max(180),
    }),
    es: z.object({
      eyebrow: z.string().min(2).max(120),
      title: z.string().min(2).max(160),
      subtitle: z.string().min(2).max(280),
      cta: z.string().min(2).max(80),
      promoTitle: z.string().min(2).max(120),
      promoBody: z.string().min(2).max(180),
    }),
  }),
  toolFeatures: z.array(z.object({
    labelEn: z.string().min(2).max(80),
    labelEs: z.string().min(2).max(80),
    imageUrl: z.string().url().nullable(),
  })).length(6),
});

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json(await getStoreSettings());
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = SettingsInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updatedAt = new Date();
  await db.insert(settings).values([
    {
      key: "hero_image_url",
      value: { url: parsed.data.heroImageUrl },
      updatedAt,
    },
    {
      key: "favicon_url",
      value: { url: parsed.data.faviconUrl },
      updatedAt,
    },
    {
      key: "store_profile",
      value: {
        storeName: parsed.data.storeName,
        themePreset: parsed.data.themePreset,
        fontPreset: parsed.data.fontPreset,
        hero: parsed.data.hero,
        toolFeatures: parsed.data.toolFeatures,
      },
      updatedAt,
    },
  ]).onConflictDoUpdate({
    target: settings.key,
    set: {
      value: sql`excluded.value`,
      updatedAt,
    },
  });

  return NextResponse.json({ ok: true });
}
