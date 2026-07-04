"use client";
// ============================================================
// The product modal — where the sale happens.
// 4-image rotator (auto-advance, pause on hover, swipe on mobile),
// stamped SKU, condition + stock badges, specs table,
// "customers also bought" row fed by /api/products/[id]/related.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ShoppingCart, Zap, MapPin } from "lucide-react";
import { useCart, fmt } from "@/lib/cart";
import { useTranslations, useLocale } from "next-intl";

type ProductFull = {
  id: string; slug: string; sku: string;
  name: string; description: string | null;
  brandName: string | null; categoryName: string | null;
  priceCents: number; compareAtCents: number | null;
  condition: string; stockStatus: string; quantity: number;
  allowShipping: boolean;
  specs: Record<string, string> | null;
  images: { url: string; alt: string | null }[];
};

type RelatedCard = {
  id: string; slug: string; name: string;
  priceCents: number; imageUrl: string | null;
};

export function ProductModal({
  product, onClose, onOpenProduct,
}: {
  product: ProductFull;
  onClose: () => void;
  onOpenProduct: (slug: string) => void; // clicking an also-bought card swaps the modal
}) {
  const t = useTranslations("modal");
  const tc = useTranslations("catalog");
  const locale = useLocale();
  const cart = useCart();

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [related, setRelated] = useState<RelatedCard[]>([]);
  const touchX = useRef<number | null>(null);
  const imgs = product.images.slice(0, 4);
  const buyable = product.stockStatus === "in_stock" || product.stockStatus === "pickup_only";

  // Rotator: advance every 3.5s unless hovered/touched
  useEffect(() => {
    if (paused || imgs.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 3500);
    return () => clearInterval(id);
  }, [paused, imgs.length]);

  // Also-bought fetch
  useEffect(() => {
    fetch(`/api/products/${product.id}/related`)
      .then((r) => r.json())
      .then(setRelated)
      .catch(() => setRelated([]));
  }, [product.id]);

  // Esc to close, arrows to rotate
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % imgs.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + imgs.length) % imgs.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [imgs.length, onClose]);

  const addToCart = useCallback(() => {
    cart.add({
      productId: product.id, slug: product.slug, name: product.name,
      priceCents: product.priceCents, imageUrl: imgs[0]?.url ?? null,
      maxQty: product.quantity,
      pickupOnly: product.stockStatus === "pickup_only" || !product.allowShipping,
    });
  }, [cart, product, imgs]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={product.name}
    >
      <div
        className="plate max-h-[92vh] w-full max-w-3xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- Rotator ---- */}
        <div
          className="relative aspect-[4/3] bg-forge-900"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -40) setIdx((i) => (i + 1) % imgs.length);
            if (dx > 40) setIdx((i) => (i - 1 + imgs.length) % imgs.length);
            touchX.current = null; setPaused(false);
          }}
        >
          {imgs.map((img, i) => (
            <img key={img.url} src={img.url} alt={img.alt ?? product.name}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${i === idx ? "opacity-100" : "opacity-0"}`} />
          ))}
          {imgs.length > 1 && (
            <>
              <button onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-forge-900/70 p-2 hover:bg-forge-700"
                aria-label="Previous image"><ChevronLeft className="h-5 w-5 text-steel-100" /></button>
              <button onClick={() => setIdx((i) => (i + 1) % imgs.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-forge-900/70 p-2 hover:bg-forge-700"
                aria-label="Next image"><ChevronRight className="h-5 w-5 text-steel-100" /></button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {imgs.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} aria-label={`Image ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-torch-500" : "w-1.5 bg-steel-400/60"}`} />
                ))}
              </div>
            </>
          )}
          <button onClick={onClose} aria-label="Close"
            className="absolute right-2 top-2 rounded bg-forge-900/70 p-2 hover:bg-torch-600">
            <X className="h-5 w-5 text-steel-100" />
          </button>
        </div>

        {/* ---- Details ---- */}
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="stamped">{product.brandName} · {t("sku")} {product.sku}</p>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-steel-100">
                {product.name}
              </h2>
            </div>
            <div className="text-right">
              {product.compareAtCents && product.compareAtCents > product.priceCents && (
                <p className="text-sm text-steel-400 line-through">{fmt(product.compareAtCents, locale)}</p>
              )}
              <p className="font-mono text-2xl font-bold text-torch-400">{fmt(product.priceCents, locale)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
            <span className="rounded bg-forge-600 px-2 py-1 text-steel-300">{tc(`condition.${product.condition}`)}</span>
            {product.stockStatus === "in_stock" && product.quantity <= 3 && (
              <span className="rounded bg-caution-400/15 px-2 py-1 text-caution-400">{tc("lowStock", { n: product.quantity })}</span>
            )}
            {product.stockStatus === "pickup_only" && (
              <span className="flex items-center gap-1 rounded bg-torch-500/15 px-2 py-1 text-torch-400">
                <MapPin className="h-3 w-3" />{tc("pickupOnly")}
              </span>
            )}
          </div>

          {product.description && <p className="text-sm leading-relaxed text-steel-300">{product.description}</p>}

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div>
              <p className="stamped mb-2">{t("specs")}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-forge-600 py-1">
                    <dt className="text-steel-400">{k}</dt><dd className="font-mono text-steel-100">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {buyable && (
            <div className="flex gap-3">
              <button onClick={addToCart} className="btn-torch flex flex-1 items-center justify-center gap-2 px-4 py-3">
                <ShoppingCart className="h-5 w-5" />{t("addToCart")}
              </button>
              <button onClick={() => { addToCart(); window.location.href = `/${locale}/checkout`; }}
                className="plate flex items-center gap-2 px-4 py-3 font-display font-bold uppercase tracking-wide text-steel-100 hover:border-torch-500">
                <Zap className="h-5 w-5 text-torch-500" />{t("buyNow")}
              </button>
            </div>
          )}

          {/* ---- Customers also bought ---- */}
          {related.length > 0 && (
            <div className="border-t border-forge-600 pt-4">
              <p className="stamped mb-3">{t("alsoBought")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onOpenProduct(r.slug)}
                    className="plate group overflow-hidden text-left transition hover:border-torch-500">
                    <div className="aspect-square bg-forge-900">
                      {r.imageUrl && <img src={r.imageUrl} alt={r.name}
                        className="h-full w-full object-contain transition group-hover:scale-105" />}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs text-steel-300">{r.name}</p>
                      <p className="font-mono text-sm font-bold text-torch-400">{fmt(r.priceCents, locale)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
