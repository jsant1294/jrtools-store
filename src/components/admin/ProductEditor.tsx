"use client";
// One form for new + edit. Fields ordered by what the hermano touches most:
// photos first (camera!), then name/price, then the rest collapsible.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductImageUploader } from "./ProductImageUploader";
import { Save, Trash2, Sparkles, Loader2, Plus } from "lucide-react";

const input = "plate w-full bg-transparent px-3 py-3 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500";
const label = "stamped mb-1 block";

export function ProductEditor({ initial, brands, categories, productId }: {
  initial: any; brands: any[]; categories: any[]; productId?: string;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    sku: initial?.sku ?? "", slug: initial?.slug ?? "",
    nameEn: initial?.nameEn ?? "", nameEs: initial?.nameEs ?? "",
    descriptionEn: initial?.descriptionEn ?? "", descriptionEs: initial?.descriptionEs ?? "",
    brandId: initial?.brandId ?? null, categoryId: initial?.categoryId ?? null,
    priceDollars: initial ? (initial.priceCents / 100).toFixed(2) : "",
    compareDollars: initial?.compareAtCents ? (initial.compareAtCents / 100).toFixed(2) : "",
    condition: initial?.condition ?? "new",
    stockStatus: initial?.stockStatus ?? "in_stock",
    quantity: initial?.quantity ?? 1,
    allowShipping: initial?.allowShipping ?? true,
  });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    Object.entries(initial?.specs ?? {}).map(([key, value]) => ({ key, value: value as string })),
  );
  const [images, setImages] = useState<{ url: string }[]>(initial?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  async function aiFill() {
    if (!aiQuery.trim()) return;
    setAiLoading(true); setAiErr(null);
    try {
      const res = await fetch("/api/admin/products/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? "AI fill failed");

      const brand = brands.find((b) => b.slug === data.brandSlug);
      const category = categories.find((c) => c.slug === data.categorySlug);
      setF((p) => ({
        ...p,
        nameEn: data.nameEn ?? p.nameEn,
        nameEs: data.nameEs ?? p.nameEs,
        descriptionEn: data.descriptionEn ?? p.descriptionEn,
        descriptionEs: data.descriptionEs ?? p.descriptionEs,
        brandId: brand?.id ?? p.brandId,
        categoryId: category?.id ?? p.categoryId,
        condition: data.condition ?? p.condition,
        priceDollars: p.priceDollars || (data.suggestedPriceCents != null ? (data.suggestedPriceCents / 100).toFixed(2) : p.priceDollars),
      }));
      if (data.specs) {
        setSpecs(Object.entries(data.specs as Record<string, string>).map(([key, value]) => ({ key, value })));
      }
    } catch (error) {
      setAiErr(error instanceof Error ? error.message : "AI fill failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    setSaving(true); setErr(null);
    const body = {
      sku: f.sku, slug: f.slug || autoSlug(f.nameEn),
      nameEn: f.nameEn, nameEs: f.nameEs || f.nameEn,
      descriptionEn: f.descriptionEn, descriptionEs: f.descriptionEs || f.descriptionEn,
      brandId: f.brandId, categoryId: f.categoryId,
      priceCents: Math.round(parseFloat(f.priceDollars || "0") * 100),
      compareAtCents: f.compareDollars ? Math.round(parseFloat(f.compareDollars) * 100) : null,
      condition: f.condition, stockStatus: f.stockStatus,
      quantity: Number(f.quantity), allowShipping: f.allowShipping,
      images: images.filter((i) => i.url).map((i) => ({ url: i.url })),
      specs: Object.fromEntries(specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()])),
    };
    const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) router.push("/admin/products");
    else { setErr("Save failed — check SKU is unique / Revisa que el SKU sea único"); setSaving(false); }
  }

  async function hide() {
    if (!productId || !confirm("Hide this product? / ¿Ocultar este producto?")) return;
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    router.push("/admin/products");
  }

  return (
    <div className="space-y-5">
      <div className="plate space-y-2 p-4">
        <span className={label}>Quick Fill with AI / Autocompletar con IA</span>
        <div className="flex gap-2">
          <input className={input} value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
            placeholder="e.g. Milwaukee M18 Fuel Hammer Drill" disabled={aiLoading}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aiFill(); } }} />
          <button type="button" onClick={aiFill} disabled={aiLoading || !aiQuery.trim()}
            className="btn-torch flex items-center gap-2 whitespace-nowrap px-4 disabled:opacity-40">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate / Generar
          </button>
        </div>
        <p className="text-xs text-steel-400">
          Type the tool's name or model — AI fills name, description, specs, brand/type match, and a suggested price below. Review everything before saving. / Escribe el nombre o modelo — la IA llena nombre, descripción, specs, marca/tipo y un precio sugerido abajo. Revisa todo antes de guardar.
        </p>
        {aiErr && <p className="text-sm text-torch-400">{aiErr}</p>}
      </div>

      <div>
        <span className={label}>Photos / Fotos (up to 4)</span>
        <ProductImageUploader images={images} onChange={setImages as any}
          labels={{ drop: "Drop or tap / Suelta o toca", takePhoto: "Take Photo / Tomar Foto",
            maxReached: "4 max", uploading: "Uploading…" }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><span className={label}>Name (English)</span>
          <input className={input} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></div>
        <div><span className={label}>Nombre (Español)</span>
          <input className={input} value={f.nameEs} onChange={(e) => set("nameEs", e.target.value)}
            placeholder="Same as English if empty" /></div>
        <div><span className={label}>Price / Precio ($)</span>
          <input className={input} inputMode="decimal" value={f.priceDollars}
            onChange={(e) => set("priceDollars", e.target.value)} /></div>
        <div><span className={label}>Compare-at / Precio Anterior ($ — optional)</span>
          <input className={input} inputMode="decimal" value={f.compareDollars}
            onChange={(e) => set("compareDollars", e.target.value)} /></div>
        <div><span className={label}>SKU / No. de Parte</span>
          <input className={input} value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())}
            placeholder="JR-MIL-0042" /></div>
        <div><span className={label}>Quantity / Cantidad</span>
          <input className={input} inputMode="numeric" value={f.quantity}
            onChange={(e) => set("quantity", e.target.value)} /></div>
        <div><span className={label}>Brand / Marca</span>
          <select className={input} value={f.brandId ?? ""} onChange={(e) => set("brandId", e.target.value || null)}>
            <option value="">—</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></div>
        <div><span className={label}>Type / Tipo</span>
          <select className={input} value={f.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn} / {c.nameEs}</option>)}
          </select></div>
        <div><span className={label}>Condition / Condición</span>
          <select className={input} value={f.condition} onChange={(e) => set("condition", e.target.value)}>
            <option value="new">New / Nueva</option>
            <option value="open_box">Open Box / Caja Abierta</option>
            <option value="refurbished">Refurbished / Reacondicionada</option>
            <option value="used">Used / Usada</option>
          </select></div>
        <div><span className={label}>Shipping OK / Se Envía</span>
          <select className={input} value={String(f.allowShipping)}
            onChange={(e) => set("allowShipping", e.target.value === "true")}>
            <option value="true">Yes / Sí</option>
            <option value="false">Pickup only / Solo recogida</option>
          </select></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><span className={label}>Description (English)</span>
          <textarea className={input} rows={3} value={f.descriptionEn}
            onChange={(e) => set("descriptionEn", e.target.value)} /></div>
        <div><span className={label}>Descripción (Español)</span>
          <textarea className={input} rows={3} value={f.descriptionEs}
            onChange={(e) => set("descriptionEs", e.target.value)} /></div>
      </div>

      <div className="space-y-2">
        <span className={label}>Specs / Especificaciones</span>
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input className={input} placeholder="Voltage" value={s.key}
                onChange={(e) => setSpecs((prev) => prev.map((row, idx) => idx === i ? { ...row, key: e.target.value } : row))} />
              <input className={input} placeholder="18V" value={s.value}
                onChange={(e) => setSpecs((prev) => prev.map((row, idx) => idx === i ? { ...row, value: e.target.value } : row))} />
              <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                className="plate px-3 text-torch-400 hover:border-torch-500" aria-label="Remove spec">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
            className="plate flex items-center gap-2 px-3 py-2 text-sm text-steel-300 hover:border-steel-400">
            <Plus className="h-4 w-4" /> Add Spec / Agregar Spec
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-torch-400">{err}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving || !f.nameEn || !f.priceDollars || !f.sku}
          className="btn-torch flex flex-1 items-center justify-center gap-2 px-4 py-4 text-lg disabled:opacity-40">
          <Save className="h-5 w-5" /> {saving ? "Saving…" : "Save / Guardar"}
        </button>
        {productId && (
          <button onClick={hide} className="plate flex items-center gap-2 px-4 text-torch-400 hover:border-torch-500">
            <Trash2 className="h-5 w-5" /> Hide / Ocultar
          </button>
        )}
      </div>
    </div>
  );
}
