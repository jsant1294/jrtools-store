"use client";
// The screen the hermano lives in. Every product row has ONE big status
// button that cycles in_stock -> pickup_only -> out_of_stock -> hidden.
// No dropdowns, no forms for the daily inventory dance.
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Plus, Pencil } from "lucide-react";
import { fmt } from "@/lib/cart";

const CYCLE = ["in_stock", "pickup_only", "out_of_stock", "hidden"] as const;
const STATUS_UI: Record<string, { label: string; cls: string }> = {
  in_stock:     { label: "In Stock / Disponible",   cls: "bg-confirm-500/15 text-confirm-500 border-confirm-500/40" },
  pickup_only:  { label: "Pickup Only / Solo Local", cls: "bg-caution-400/15 text-caution-400 border-caution-400/40" },
  out_of_stock: { label: "Sold Out / Agotado",       cls: "bg-torch-500/15 text-torch-400 border-torch-500/40" },
  hidden:       { label: "Hidden / Oculto",          cls: "bg-forge-600 text-steel-400 border-forge-600" },
};

export default function AdminProducts() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");

  const load = () => fetch("/api/admin/products").then(async (r) => {
    if (r.status === 401) { window.location.href = "/admin"; return; }
    setData(await r.json());
  });
  useEffect(() => { load(); }, []);

  async function cycleStatus(p: any) {
    const next = CYCLE[(CYCLE.indexOf(p.stockStatus) + 1) % CYCLE.length];
    setData((d: any) => ({ ...d, products: d.products.map((x: any) => x.id === p.id ? { ...x, stockStatus: next } : x) }));
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockStatus: next }),
    });
  }

  async function setQty(p: any, qty: number) {
    if (qty < 0) return;
    setData((d: any) => ({ ...d, products: d.products.map((x: any) => x.id === p.id ? { ...x, quantity: qty } : x) }));
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
  }

  if (!data) return <div className="grid min-h-screen place-items-center text-steel-400">Loading…</div>;
  const list = data.products.filter((p: any) =>
    !q || [p.nameEn, p.nameEs, p.sku].some((s: string) => s?.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search / Buscar…"
            className="plate flex-1 bg-transparent px-4 py-3 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500" />
          <Link href="/admin/products/new" className="btn-torch flex items-center gap-2 px-5 py-3">
            <Plus className="h-5 w-5" /> New Product / Nuevo
          </Link>
        </div>

        <div className="space-y-2">
          {list.map((p: any) => {
            const s = STATUS_UI[p.stockStatus];
            return (
              <div key={p.id} className="plate flex flex-wrap items-center gap-3 p-3">
                <div className="h-14 w-14 shrink-0 bg-forge-900">
                  {p.images[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-contain" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="stamped">{p.sku}</p>
                  <p className="truncate text-sm font-medium">{p.nameEn}</p>
                  <p className="font-mono text-sm font-bold text-torch-400">{fmt(p.priceCents)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(p, p.quantity - 1)} className="plate h-10 w-10 font-mono hover:border-torch-500">−</button>
                  <span className="w-10 text-center font-mono text-lg">{p.quantity}</span>
                  <button onClick={() => setQty(p, p.quantity + 1)} className="plate h-10 w-10 font-mono hover:border-torch-500">+</button>
                </div>
                <button onClick={() => cycleStatus(p)}
                  className={`min-w-48 rounded border px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${s.cls}`}>
                  {s.label}
                </button>
                <Link href={`/admin/products/${p.id}`} className="plate p-2.5 hover:border-torch-500" aria-label="Edit">
                  <Pencil className="h-4 w-4 text-steel-300" />
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
