import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { products, productImages, brands, categories } from "@/db/schema";
import { ne, asc } from "drizzle-orm";
import { Catalog } from "@/components/Catalog";
import { MapPin, Truck } from "lucide-react";
import { getStoreSettings } from "@/lib/storeSettings";

export const revalidate = 60;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("hero");

  const [rows, imgs, brandRows, catRows, store] = await Promise.all([
    db.select().from(products).where(ne(products.stockStatus, "hidden")),
    db.select().from(productImages).orderBy(asc(productImages.position)),
    db.select().from(brands).orderBy(asc(brands.sortOrder)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    getStoreSettings(),
  ]);

  // Unsplash placeholder until admin takes control via settings table
  const heroUrl = store.heroImageUrl
    ?? "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1920&q=80";
  const hero = locale === "es" ? store.hero.es : store.hero.en;

  const catalogProducts = rows.map((p) => ({
    id: p.id, slug: p.slug, sku: p.sku,
    name: locale === "es" ? p.nameEs : p.nameEn,
    description: locale === "es" ? p.descriptionEs : p.descriptionEn,
    brandId: p.brandId, brandName: brandRows.find((b) => b.id === p.brandId)?.name ?? null,
    categoryId: p.categoryId,
    categoryName: (() => {
      const c = catRows.find((c) => c.id === p.categoryId);
      return c ? (locale === "es" ? c.nameEs : c.nameEn) : null;
    })(),
    priceCents: p.priceCents, compareAtCents: p.compareAtCents,
    condition: p.condition ?? "new", stockStatus: p.stockStatus,
    quantity: p.quantity ?? 0, allowShipping: p.allowShipping ?? true,
    specs: p.specs ?? null,
    images: imgs.filter((i) => i.productId === p.id).slice(0, 4)
      .map((i) => ({ url: i.url, alt: locale === "es" ? i.altEs : i.altEn })),
  }));

  return (
    <main className="min-h-screen bg-forge-900">
      {/* ---- HERO — editable tenant identity moment ---- */}
      <section className="diamond-plate relative overflow-hidden border-b-4 border-torch-500">
        <div className="absolute inset-0">
          <img src={heroUrl} alt="" className="h-full w-full object-cover opacity-95" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-forge-900)_0%,rgba(20,22,25,0.94)_28%,rgba(20,22,25,0.50)_52%,rgba(20,22,25,0.12)_76%,rgba(20,22,25,0)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_38%,rgba(255,255,255,0.10),transparent_30%),radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.58),transparent_36%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-forge-900/95 via-transparent to-forge-900/20" />
        </div>
        <div className="relative mx-auto grid min-h-[34rem] max-w-6xl items-center gap-8 px-4 py-16 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="stamped mb-4 !text-torch-400">{hero.eyebrow}</p>
            <h1 className="max-w-3xl whitespace-pre-line font-display text-5xl font-black uppercase leading-[0.9] text-steel-100 sm:text-7xl">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-steel-300">{hero.subtitle}</p>
            <a href="#catalog" className="btn-torch mt-8 inline-block px-8 py-4 text-lg">{hero.cta}</a>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-steel-300">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-torch-500" />{t("pickup")}</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-torch-500" />{t("shipping")}</span>
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="border border-torch-500/80 bg-forge-900/78 p-5 shadow-2xl shadow-black/60 backdrop-blur-sm">
              <p className="whitespace-pre-line font-display text-2xl font-black uppercase leading-tight text-white">{hero.promoTitle}</p>
              <div className="my-4 h-px w-20 bg-torch-500" />
              <p className="text-sm leading-relaxed text-steel-300">{hero.promoBody}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-forge-600 bg-forge-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5">
          <div className="mr-2">
            <p className="text-xs font-bold uppercase tracking-wide text-steel-100">
              {locale === "es" ? "Marcas disponibles" : "Available brands"}
            </p>
            <p className="stamped !text-torch-400">{locale === "es" ? "Calidad Pro" : "Pro quality"}</p>
          </div>
          {brandRows.map((brand) => (
            <span key={brand.id} className="font-display text-xl font-black uppercase text-steel-100 opacity-85">
              {brand.name}
            </span>
          ))}
        </div>
      </section>

      <section className="border-b border-forge-600 bg-forge-900/95">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-5 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-torch-500/50" />
            <h2 className="font-display text-xl font-black uppercase tracking-wide text-steel-100">
              {locale === "es" ? "Herramientas Destacadas" : "Featured Tools"}
            </h2>
            <div className="h-px w-16 bg-torch-500/50" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {store.toolFeatures.map((feature, i) => (
              <a
                key={`${feature.labelEn}-${i}`}
                href="#catalog"
                className="plate group flex min-h-40 flex-col overflow-hidden transition hover:border-torch-500"
              >
                <div className="grid h-28 place-items-center overflow-hidden bg-forge-900">
                  {feature.imageUrl ? (
                    <img src={feature.imageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <span className="stamped px-3 text-center !text-steel-400">
                      {locale === "es" ? "Imagen" : "Image"}
                    </span>
                  )}
                </div>
                <div className="grid flex-1 place-items-center px-3 py-3 text-center">
                  <span className="font-display text-sm font-black uppercase leading-tight text-steel-100">
                    {locale === "es" ? feature.labelEs : feature.labelEn}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Catalog
        products={catalogProducts}
        brands={brandRows.map((b) => ({ id: b.id, name: b.name }))}
        categories={catRows.map((c) => ({ id: c.id, name: locale === "es" ? c.nameEs : c.nameEn }))}
      />
    </main>
  );
}
