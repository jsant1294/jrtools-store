"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Package, ClipboardList, Wrench, ExternalLink, Image } from "lucide-react";

export function AdminNav() {
  const path = usePathname();
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setIsMaster(data.role === "master");
    });
  }, []);

  const tab = (href: string, active: boolean, icon: React.ReactNode, label: string) => (
    <Link href={href}
      className={`flex items-center gap-2 rounded px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition
        ${active ? "bg-torch-500 text-white" : "text-steel-300 hover:bg-forge-700"}`}>
      {icon}{label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-forge-600 bg-forge-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Wrench className="h-5 w-5 text-torch-500" />
        <span className="mr-4 font-display font-bold uppercase">Admin</span>
        {tab("/admin/products", path.startsWith("/admin/products"), <Package className="h-4 w-4" />, "Products / Productos")}
        {tab("/admin/orders", path.startsWith("/admin/orders"), <ClipboardList className="h-4 w-4" />, "Orders / Pedidos")}
        {isMaster && tab("/admin/settings", path.startsWith("/admin/settings"), <Image className="h-4 w-4" />, "Settings / Ajustes")}
        <a href="/en" target="_blank" className="ml-auto flex items-center gap-1 text-xs text-steel-400 hover:text-steel-100">
          View store <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </header>
  );
}
