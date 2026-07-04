import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantWidget } from "@/components/AssistantWidget";
import { getStoreSettings } from "@/lib/storeSettings";
import "../globals.css";

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
