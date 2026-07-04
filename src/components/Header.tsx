"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Wrench } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useTranslations } from "next-intl";

export function Header({ locale, storeName = "JR Tools USA" }: { locale: string; storeName?: string }) {
  const { count } = useCart();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const other = locale === "en" ? "es" : "en";
  const switched = pathname.replace(`/${locale}`, `/${other}`);

  return (
    <header className="sticky top-0 z-40 border-b border-forge-600 bg-forge-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-torch-500" />
          <span className="font-display text-xl font-bold uppercase tracking-wider text-steel-100">
            {storeName}
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href={switched} className="stamped hover:text-steel-100">{other.toUpperCase()}</Link>
          <Link href={`/${locale}/checkout`} aria-label={t("cart")}
            className="plate relative flex items-center gap-2 px-3 py-2 hover:border-torch-500">
            <ShoppingCart className="h-5 w-5 text-steel-100" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-torch-500 font-mono text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
