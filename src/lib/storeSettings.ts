import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const THEME_PRESETS = ["torch", "cobalt", "forest", "gold", "graphite"] as const;
export type ThemePreset = typeof THEME_PRESETS[number];
export const FONT_PRESETS = ["industrial", "compact", "editorial", "classic"] as const;
export type FontPreset = typeof FONT_PRESETS[number];

type LocalizedHero = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  promoTitle: string;
  promoBody: string;
};

export type ToolFeature = {
  labelEn: string;
  labelEs: string;
  imageUrl: string | null;
};

export type StoreSettings = {
  storeName: string;
  themePreset: ThemePreset;
  fontPreset: FontPreset;
  heroImageUrl: string | null;
  faviconUrl: string | null;
  hero: {
    en: LocalizedHero;
    es: LocalizedHero;
  };
  toolFeatures: ToolFeature[];
};

export const DEFAULT_TOOL_FEATURES: ToolFeature[] = [
  { labelEn: "Drills & Drivers", labelEs: "Taladros y Atornilladores", imageUrl: null },
  { labelEn: "Saws", labelEs: "Sierras", imageUrl: null },
  { labelEn: "Batteries", labelEs: "Baterias", imageUrl: null },
  { labelEn: "Hand Tools", labelEs: "Herramienta Manual", imageUrl: null },
  { labelEn: "Accessories", labelEs: "Accesorios", imageUrl: null },
  { labelEn: "Deals", labelEs: "Ofertas", imageUrl: null },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "JR Tools USA",
  themePreset: "torch",
  fontPreset: "industrial",
  heroImageUrl: null,
  faviconUrl: null,
  hero: {
    en: {
      eyebrow: "PROFESSIONAL TOOL DEALS",
      title: "Built to Work.\nPriced to Move.",
      subtitle: "Pro-grade tools from the brands you trust - new, open box, and smart finds. Pick up local or we ship it.",
      cta: "Shop the Inventory",
      promoTitle: "New. Open Box.\nBig Savings.",
      promoBody: "Top brands. Pro quality. Unbeatable prices.",
    },
    es: {
      eyebrow: "OFERTAS EN HERRAMIENTA PROFESIONAL",
      title: "Hechas para Trabajar.\nA Precio de Salida.",
      subtitle: "Herramienta profesional de las marcas de confianza - nueva, open box y buenos hallazgos. Recoge local o te la enviamos.",
      cta: "Ver Inventario",
      promoTitle: "Nueva. Open Box.\nGran Ahorro.",
      promoBody: "Marcas top. Calidad pro. Precios fuertes.",
    },
  },
  toolFeatures: DEFAULT_TOOL_FEATURES,
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings).where(inArray(settings.key, [
    "store_profile",
    "hero_image_url",
    "favicon_url",
  ]));

  const profile = rows.find((row) => row.key === "store_profile")?.value as {
    storeName?: string;
    themePreset?: ThemePreset;
    fontPreset?: FontPreset;
    hero?: Partial<StoreSettings["hero"]>;
    toolFeatures?: Partial<ToolFeature>[];
  } | undefined;
  const hero = rows.find((row) => row.key === "hero_image_url")?.value as {
    url?: string | null;
  } | undefined;
  const favicon = rows.find((row) => row.key === "favicon_url")?.value as {
    url?: string | null;
  } | undefined;

  const themePreset = THEME_PRESETS.includes(profile?.themePreset as ThemePreset)
    ? profile!.themePreset!
    : DEFAULT_STORE_SETTINGS.themePreset;
  const fontPreset = FONT_PRESETS.includes(profile?.fontPreset as FontPreset)
    ? profile!.fontPreset!
    : DEFAULT_STORE_SETTINGS.fontPreset;

  return {
    storeName: profile?.storeName?.trim() || DEFAULT_STORE_SETTINGS.storeName,
    themePreset,
    fontPreset,
    heroImageUrl: hero?.url ?? DEFAULT_STORE_SETTINGS.heroImageUrl,
    faviconUrl: favicon?.url ?? DEFAULT_STORE_SETTINGS.faviconUrl,
    hero: {
      en: { ...DEFAULT_STORE_SETTINGS.hero.en, ...(profile?.hero?.en ?? {}) },
      es: { ...DEFAULT_STORE_SETTINGS.hero.es, ...(profile?.hero?.es ?? {}) },
    },
    toolFeatures: DEFAULT_TOOL_FEATURES.map((feature, i) => ({
      ...feature,
      ...(profile?.toolFeatures?.[i] ?? {}),
      imageUrl: profile?.toolFeatures?.[i]?.imageUrl || null,
    })),
  };
}
