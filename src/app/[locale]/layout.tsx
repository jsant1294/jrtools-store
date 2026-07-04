import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantWidget } from "@/components/AssistantWidget";
import { getStoreSettings } from "@/lib/storeSettings";
import type { Metadata } from "next";
import "../globals.css";

const DEFAULT_HERO = "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80";

// Each tenant is its own Vercel project/domain, so this must never be
// hardcoded to one tenant's URL — derive it from the deployment instead.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const store = await getStoreSettings();
  const hero = locale === "es" ? store.hero.es : store.hero.en;
  const title = `${store.storeName} | ${hero.title.replace(/\s+/g, " ")}`;
  const description = hero.subtitle;
  const image = store.heroImageUrl ?? DEFAULT_HERO;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    ...(store.faviconUrl ? { icons: { icon: store.faviconUrl } } : {}),
    openGraph: {
      type: "website",
      locale,
      siteName: store.storeName,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: store.storeName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function LocaleLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages();
  const store = await getStoreSettings();
  return (
    <html lang={locale}>
      <body data-theme={store.themePreset} data-font={store.fontPreset} className="bg-forge-900 font-body text-steel-100 antialiased">
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <Header locale={locale} storeName={store.storeName} />
            {children}
            <Footer locale={locale} storeName={store.storeName} />
            <AssistantWidget />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
