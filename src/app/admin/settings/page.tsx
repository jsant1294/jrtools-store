"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Camera, ImagePlus, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { uploadAdminImage } from "@/lib/clientImages";

const input = "plate w-full bg-transparent px-3 py-3 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500";
const label = "stamped mb-1 block";
const DEFAULT_HERO = "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1920&q=80";
const THEMES = [
  { id: "torch", label: "Torch Red", color: "#db1f26" },
  { id: "cobalt", label: "Cobalt Blue", color: "#2383d1" },
  { id: "forest", label: "Forest Green", color: "#2f9b68" },
  { id: "gold", label: "Shop Gold", color: "#d99512" },
  { id: "graphite", label: "Graphite", color: "#8792a1" },
] as const;
type ThemeId = typeof THEMES[number]["id"];
const FONTS = [
  { id: "industrial", label: "Industrial" },
  { id: "compact", label: "Compact" },
  { id: "editorial", label: "Editorial" },
  { id: "classic", label: "Classic" },
] as const;
type FontId = typeof FONTS[number]["id"];
type BrandRow = { id: string; name: string; sortOrder: number; productCount: number };

const DEFAULT_HERO_COPY = {
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
};
const DEFAULT_TOOL_FEATURES = [
  { labelEn: "Drills & Drivers", labelEs: "Taladros y Atornilladores", imageUrl: "" },
  { labelEn: "Saws", labelEs: "Sierras", imageUrl: "" },
  { labelEn: "Batteries", labelEs: "Baterias", imageUrl: "" },
  { labelEn: "Hand Tools", labelEs: "Herramienta Manual", imageUrl: "" },
  { labelEn: "Accessories", labelEs: "Accesorios", imageUrl: "" },
  { labelEn: "Deals", labelEs: "Ofertas", imageUrl: "" },
];

export default function AdminSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const [storeName, setStoreName] = useState("JR Tools USA");
  const [themePreset, setThemePreset] = useState<ThemeId>("torch");
  const [fontPreset, setFontPreset] = useState<FontId>("industrial");
  const [hero, setHero] = useState(DEFAULT_HERO_COPY);
  const [toolFeatures, setToolFeatures] = useState(DEFAULT_TOOL_FEATURES);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/admin/settings"), fetch("/api/admin/brands")]).then(async ([settingsRes, brandsRes]) => {
      if (settingsRes.status === 401 || brandsRes.status === 401) { window.location.href = "/admin"; return; }
      if (settingsRes.status === 403 || brandsRes.status === 403) { setForbidden(true); setLoading(false); return; }
      const data = await settingsRes.json();
      setStoreName(data.storeName ?? "JR Tools USA");
      setThemePreset(data.themePreset ?? "torch");
      setFontPreset(data.fontPreset ?? "industrial");
      setHero({
        en: { ...DEFAULT_HERO_COPY.en, ...(data.hero?.en ?? {}) },
        es: { ...DEFAULT_HERO_COPY.es, ...(data.hero?.es ?? {}) },
      });
      setToolFeatures(DEFAULT_TOOL_FEATURES.map((feature, i) => ({
        ...feature,
        ...(data.toolFeatures?.[i] ?? {}),
        imageUrl: data.toolFeatures?.[i]?.imageUrl ?? "",
      })));
      setHeroImageUrl(data.heroImageUrl ?? "");
      setFaviconUrl(data.faviconUrl ?? "");
      setBrands(await brandsRes.json());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    document.body.dataset.theme = themePreset;
    document.body.dataset.font = fontPreset;
  }, [themePreset, fontPreset]);

  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setErr(null);

    try {
      const url = await uploadImage(file, "hero");
      if (url) setHeroImageUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function uploadToolFeature(file: File | null, index: number) {
    if (!file) return;
    setUploading(true);
    setErr(null);

    try {
      const url = await uploadImage(file, "features");
      if (url) {
        setToolFeatures((prev) => prev.map((item, i) => i === index ? { ...item, imageUrl: url } : item));
      }
    } finally {
      setUploading(false);
    }
  }

  async function uploadFavicon(file: File | null) {
    if (!file) return;
    setUploading(true);
    setErr(null);

    try {
      const url = await uploadImage(file, "branding");
      if (url) setFaviconUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function uploadImage(file: File, folder: "hero" | "features" | "branding") {
    try {
      const blob = await uploadAdminImage(file, folder);
      return blob.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir";
      setErr(`Upload failed: ${message}`);
      return null;
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setErr(null);

    const clean = heroImageUrl.trim();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: storeName.trim(),
        themePreset,
        fontPreset,
        hero,
        heroImageUrl: clean || null,
        faviconUrl: faviconUrl.trim() || null,
        toolFeatures: toolFeatures.map((feature) => ({
          ...feature,
          imageUrl: feature.imageUrl.trim() || null,
        })),
      }),
    });

    if (res.ok) setSaved(true);
    else setErr("Save failed / No se pudo guardar");

    setSaving(false);
  }

  async function addBrand() {
    const name = newBrand.trim();
    if (!name) return;
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: brands.length + 1 }),
    });
    if (res.ok) {
      const brand = await res.json();
      setBrands((prev) => [...prev, { ...brand, productCount: 0 }]);
      setNewBrand("");
    } else setErr("Brand save failed / No se pudo guardar la marca");
  }

  async function saveBrands(nextBrands = brands) {
    setBrands(nextBrands);
    const res = await fetch("/api/admin/brands", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brands: nextBrands.map((brand, i) => ({ ...brand, sortOrder: i + 1 })) }),
    });
    if (!res.ok) setErr("Brand save failed / No se pudo guardar la marca");
  }

  async function deleteBrand(brand: BrandRow) {
    if (brand.productCount > 0) {
      setErr("Brand has products. Move or hide those products first. / La marca tiene productos.");
      return;
    }
    if (!confirm(`Delete ${brand.name}?`)) return;
    const res = await fetch(`/api/admin/brands?id=${brand.id}`, { method: "DELETE" });
    if (res.ok) setBrands((prev) => prev.filter((item) => item.id !== brand.id));
    else setErr("Brand delete failed / No se pudo borrar la marca");
  }

  if (loading) return <div className="grid min-h-screen place-items-center text-steel-400">Loading...</div>;

  if (forbidden) return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="stamped mb-2 !text-torch-400">Master Admin Only</p>
        <p className="text-steel-300">
          Ask the master admin to update store settings. / Pide al administrador principal que actualice esta configuración.
        </p>
      </main>
    </>
  );

  const previewUrl = heroImageUrl.trim() || DEFAULT_HERO;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <div className="plate overflow-hidden">
          <div className="aspect-[16/7] bg-forge-800">
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className={label}>Store Name / Nombre de Tienda</span>
                <input
                  className={input}
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="JR Tools USA"
                />
              </div>
              <div>
                <span className={label}>Color Style / Estilo de Color</span>
                <div className="grid grid-cols-5 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemePreset(theme.id)}
                      className={`plate grid h-12 place-items-center transition hover:border-steel-400 ${
                        themePreset === theme.id ? "!border-torch-500" : ""
                      }`}
                      aria-label={theme.label}
                      title={theme.label}
                    >
                      <span
                        className="h-6 w-6 rounded-full border border-white/20"
                        style={{ background: theme.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={label}>Font Style / Estilo de Letra</span>
                <select className={input} value={fontPreset} onChange={(e) => setFontPreset(e.target.value as FontId)}>
                  {FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <HeroCopyFields
                title="Hero Text (English)"
                lang="en"
                hero={hero}
                setHero={setHero}
              />
              <HeroCopyFields
                title="Texto Hero (Español)"
                lang="es"
                hero={hero}
                setHero={setHero}
              />
            </div>

            <div>
              <span className={label}>Hero Image / Imagen Principal</span>
              <input
                className={input}
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder={DEFAULT_HERO}
              />
            </div>

            <div className="plate flex items-center gap-4 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded bg-forge-900">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="stamped !text-steel-400">—</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-display text-base font-bold uppercase tracking-wide text-steel-100">
                  Favicon / Icono del Sitio
                </p>
                <p className="text-xs text-steel-400">
                  Browser tab icon for this store. Square image, 512x512 recommended. / Icono de pestaña. Imagen cuadrada, 512x512 recomendado.
                </p>
              </div>
              <label className="plate flex cursor-pointer items-center gap-2 px-3 py-3 text-sm font-bold uppercase tracking-wide text-steel-100 hover:border-steel-400">
                <ImagePlus className="h-4 w-4 text-steel-300" /> Upload / Subir
                <input ref={faviconRef} type="file" accept="image/*" hidden
                  onChange={(e) => uploadFavicon(e.target.files?.[0] ?? null)} />
              </label>
              {faviconUrl && (
                <button
                  type="button"
                  onClick={() => setFaviconUrl("")}
                  className="plate p-2 text-torch-400 hover:border-torch-500"
                  aria-label="Clear favicon"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="plate space-y-3 p-4">
              <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">
                Under-Bar Tool Images / Imagenes Debajo del Hero
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {toolFeatures.map((feature, i) => (
                  <div key={i} className="plate space-y-2 p-3">
                    <div className="grid h-28 place-items-center overflow-hidden bg-forge-900">
                      {feature.imageUrl ? (
                        <img src={feature.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="stamped !text-steel-400">Image {i + 1}</span>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className={input}
                        value={feature.labelEn}
                        onChange={(e) => setToolFeatures((prev) => prev.map((item, idx) => idx === i ? { ...item, labelEn: e.target.value } : item))}
                        placeholder="English label"
                      />
                      <input
                        className={input}
                        value={feature.labelEs}
                        onChange={(e) => setToolFeatures((prev) => prev.map((item, idx) => idx === i ? { ...item, labelEs: e.target.value } : item))}
                        placeholder="Etiqueta español"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="plate flex cursor-pointer items-center justify-center gap-2 px-3 py-3 text-sm font-bold uppercase tracking-wide text-steel-100 hover:border-steel-400">
                        <ImagePlus className="h-4 w-4 text-steel-300" /> Upload / Subir
                        <input type="file" accept="image/*" hidden
                          onChange={(e) => uploadToolFeature(e.target.files?.[0] ?? null, i)} />
                      </label>
                      <label className="plate flex cursor-pointer items-center justify-center gap-2 px-3 py-3 text-sm font-bold uppercase tracking-wide text-steel-100 hover:border-torch-500">
                        <Camera className="h-4 w-4 text-torch-500" /> Photo / Foto
                        <input type="file" accept="image/*" capture="environment" hidden
                          onChange={(e) => uploadToolFeature(e.target.files?.[0] ?? null, i)} />
                      </label>
                    </div>
                    {feature.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setToolFeatures((prev) => prev.map((item, idx) => idx === i ? { ...item, imageUrl: "" } : item))}
                        className="text-left text-xs font-bold uppercase tracking-wide text-steel-400 hover:text-torch-400"
                      >
                        Clear image / Quitar imagen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="plate space-y-3 p-4">
              <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">
                Brand Bar / Marcas
              </p>
              <div className="flex gap-2">
                <input
                  className={input}
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="New brand / Nueva marca"
                />
                <button type="button" onClick={addBrand} className="btn-torch flex items-center gap-2 px-4">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {brands.map((brand, i) => (
                  <div key={brand.id} className="plate flex flex-wrap items-center gap-2 p-2">
                    <span className="w-8 text-center font-mono text-sm text-steel-400">{i + 1}</span>
                    <input
                      className="min-w-48 flex-1 bg-transparent px-2 py-2 text-steel-100 outline-none"
                      value={brand.name}
                      onChange={(e) => setBrands((prev) => prev.map((item) => item.id === brand.id ? { ...item, name: e.target.value } : item))}
                      onBlur={() => saveBrands()}
                    />
                    <span className="stamped">{brand.productCount} products</span>
                    <button
                      type="button"
                      onClick={() => saveBrands(brands.map((item, idx, all) => idx === i - 1 ? brand : idx === i ? all[i - 1] : item).filter(Boolean) as BrandRow[])}
                      disabled={i === 0}
                      className="plate px-3 py-2 text-xs disabled:opacity-30"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => saveBrands(brands.map((item, idx, all) => idx === i ? all[i + 1] : idx === i + 1 ? brand : item).filter(Boolean) as BrandRow[])}
                      disabled={i === brands.length - 1}
                      className="plate px-3 py-2 text-xs disabled:opacity-30"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBrand(brand)}
                      disabled={brand.productCount > 0}
                      className="plate p-2 text-torch-400 disabled:opacity-30"
                      aria-label="Delete brand"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="plate flex min-h-28 flex-col items-center justify-center gap-2 p-5 transition hover:border-steel-400 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-7 w-7 animate-spin text-torch-500" /> : <ImagePlus className="h-7 w-7 text-steel-300" />}
                <span className="font-display text-base font-bold uppercase tracking-wide text-steel-100">
                  Upload / Subir
                </span>
              </button>

              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={uploading}
                className="plate flex min-h-28 flex-col items-center justify-center gap-2 p-5 transition hover:border-torch-500 disabled:opacity-50"
              >
                <Camera className="h-7 w-7 text-torch-500" />
                <span className="font-display text-base font-bold uppercase tracking-wide text-steel-100">
                  Take Photo / Tomar Foto
                </span>
              </button>
            </div>

            {err && <p className="text-sm text-torch-400">{err}</p>}
            {saved && <p className="text-sm text-confirm-500">Saved / Guardado</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving || uploading}
                className="btn-torch flex flex-1 items-center justify-center gap-2 px-4 py-4 text-lg disabled:opacity-40"
              >
                <Save className="h-5 w-5" /> {saving ? "Saving..." : "Save / Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setHeroImageUrl("")}
                className="plate flex items-center gap-2 px-4 text-steel-300 hover:border-torch-500"
              >
                <RotateCcw className="h-5 w-5" /> Default / Original
              </button>
            </div>
          </div>
        </div>
      </main>

      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => upload(e.target.files?.[0] ?? null)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => upload(e.target.files?.[0] ?? null)} />
    </>
  );
}

function HeroCopyFields({
  title,
  lang,
  hero,
  setHero,
}: {
  title: string;
  lang: "en" | "es";
  hero: typeof DEFAULT_HERO_COPY;
  setHero: Dispatch<SetStateAction<typeof DEFAULT_HERO_COPY>>;
}) {
  const set = (key: keyof typeof DEFAULT_HERO_COPY.en, value: string) =>
    setHero((prev) => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }));

  return (
    <div className="plate space-y-3 p-4">
      <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">{title}</p>
      <div>
        <span className={label}>Eyebrow</span>
        <input className={input} value={hero[lang].eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
      </div>
      <div>
        <span className={label}>Title</span>
        <textarea className={input} rows={2} value={hero[lang].title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <span className={label}>Subtitle</span>
        <textarea className={input} rows={3} value={hero[lang].subtitle} onChange={(e) => set("subtitle", e.target.value)} />
      </div>
      <div>
        <span className={label}>Button</span>
        <input className={input} value={hero[lang].cta} onChange={(e) => set("cta", e.target.value)} />
      </div>
      <div>
        <span className={label}>Promo Title</span>
        <textarea className={input} rows={2} value={hero[lang].promoTitle} onChange={(e) => set("promoTitle", e.target.value)} />
      </div>
      <div>
        <span className={label}>Promo Body</span>
        <textarea className={input} rows={2} value={hero[lang].promoBody} onChange={(e) => set("promoBody", e.target.value)} />
      </div>
    </div>
  );
}
