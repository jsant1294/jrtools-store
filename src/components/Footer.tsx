import Link from "next/link";
import { MapPin, ShieldCheck, Truck, Wrench } from "lucide-react";

export function Footer({ locale, storeName }: { locale: string; storeName: string }) {
  const es = locale === "es";
  const phone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim();

  return (
    <footer className="border-t border-forge-600 bg-forge-900">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-steel-300 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-torch-500" />
            <span className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">{storeName}</span>
          </div>
          <p className="mt-3 max-w-md text-steel-400">
            {es
              ? "Herramienta profesional, recogida local y envios a todo el pais."
              : "Professional tools, local pickup, and nationwide shipping."}
          </p>
        </div>

        <div className="space-y-2">
          <p className="stamped !text-steel-100">{es ? "Compra" : "Store"}</p>
          <Link href={`/${locale}#catalog`} className="block hover:text-steel-100">
            {es ? "Inventario" : "Inventory"}
          </Link>
          <Link href={`/${locale}/checkout`} className="block hover:text-steel-100">
            {es ? "Carrito" : "Cart"}
          </Link>
          {phone && (
            <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} className="block hover:text-steel-100">
              WhatsApp
            </a>
          )}
        </div>

        <div className="space-y-2">
          <p className="stamped !text-steel-100">{es ? "Servicio" : "Service"}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-torch-500" />{es ? "Recogida local" : "Local pickup"}</p>
          <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-torch-500" />{es ? "Envio nacional" : "Nationwide shipping"}</p>
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-torch-500" />{es ? "Confirmacion por WhatsApp" : "WhatsApp confirmation"}</p>
        </div>
      </div>
      <div className="border-t border-forge-600 px-4 py-4 text-center text-xs text-steel-400">
        {storeName} - {new Date().getFullYear()}
      </div>
    </footer>
  );
}
