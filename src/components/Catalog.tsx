"use client";
// Catalog — instant client-side search + brand/type filter chips over a
// server-fetched product list (100 items = no pagination needed, filter in memory).
import { useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { fmt } from "@/lib/cart";
import { ProductModal } from "./ProductModal";

export type CatalogProduct = {
  id: string; slug: string; sku: string;
  name: string; description: string | null;
  brandId: string | null; brandName: string | null;
  categoryId: string | null; categoryName: string | null;
  priceCents: number; compareAtCents: number | null;
  condition: string; stockStatus: string; quantity: number;
  allowShipping: boolean; specs: Record<string, string> | null;
  images: { url: string; alt: string | null }[];
};

export function Catalog({
  products, brands, categories,
}: {
  products: CatalogProduct[];
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("catalog");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (p.stockStatus === "hidden") return false;
      if (brand && p.brandId !== brand) return false;
      if (cat && p.categoryId !== cat) return false;
      if (!needle) return true;
      return [p.name, p.sku, p.brandName, p.categoryName, p.description]
        .filter(Boolean).some((s) => s!.toLowerCase().includes(needle));
    });
  }, [products, q, brand, cat]);

  const open = openSlug ? products.find((p) => p.slug === openSlug) : null;

  return (
    <section id="catalog" className="mx-auto max-w-6xl px-4 py-10">
      {/* Search */}
      <div className="plate mb-5 flex items-center gap-3 px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-torch-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tn("search")}
          className="w-full bg-transparent text-steel-100 placeholder-steel-400 outline-none" />
      </div>

      {/* Filter chips */}
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="stamped self-center">{t("filterBrand")}</span>
        <Chip active={!brand} onClick={() => setBrand(null)}>{t("all")}</Chip>
        {brands.map((b) => (
          <Chip key={b.id} active={brand === b.id} onClick={() => setBrand(brand === b.id ? null : b.id)}>{b.name}</Chip>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="stamped self-center">{t("filterType")}</span>
        <Chip active={!cat} onClick={() => setCat(null)}>{t("all")}</Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</Chip>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-steel-400">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setOpenSlug(p.slug)}
              className="plate group overflow-hidden text-left transition hover:border-torch-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-torch-500">
              <div className="relative aspect-square bg-forge-900">
                {p.images[0] && <img src={p.images[0].url} alt={p.images[0].alt ?? p.name}
                  loading="lazy" className="h-full w-full object-contain p-2 transition group-hover:scale-105" />}
                {p.compareAtCents && p.compareAtCents > p.priceCents && (
                  <span className="absolute left-2 top-2 rounded bg-torch-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    -{Math.round((1 - p.priceCents / p.compareAtCents) * 100)}%
                  </span>
                )}
                {p.stockStatus === "pickup_only" && (
                  <span className="absolute right-2 top-2 rounded bg-forge-900/85 p-1" title={t("pickupOnly")}>
                    <MapPin className="h-3.5 w-3.5 text-caution-400" />
                  </span>
                )}
                {p.stockStatus === "out_of_stock" && (
                  <div className="absolute inset-0 grid place-items-center bg-forge-900/70">
                    <span className="stamped text-steel-300">{t("outOfStock")}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="stamped">{p.brandName}</p>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-steel-100">{p.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-torch-400">{fmt(p.priceCents, locale)}</span>
                  {p.compareAtCents && p.compareAtCents > p.priceCents && (
                    <span className="font-mono text-xs text-steel-400 line-through">{fmt(p.compareAtCents, locale)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <ProductModal
          product={{ ...open, brandName: open.brandName, categoryName: open.categoryName }}
          onClose={() => setOpenSlug(null)}
          onOpenProduct={(slug) => setOpenSlug(slug)}
        />
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition
        ${active ? "border-torch-500 bg-torch-500/15 text-torch-400" : "border-forge-600 text-steel-300 hover:border-steel-400"}`}>
      {children}
    </button>
  );
}
