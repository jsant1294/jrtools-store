"use client";
// Order board — expediter's window. Each ticket shows customer, items,
// payment method, and ONE advance button that moves it down the line:
// pending_payment -> paid -> ready/shipped -> completed.
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { fmt } from "@/lib/cart";
import { MapPin, Truck, MessageCircle } from "lucide-react";

const NEXT: Record<string, { to: string; label: string } | null> = {
  pending_payment: { to: "paid", label: "Mark Paid / Pagado" },
  paid: { to: "", label: "" }, // resolved per-fulfillment below
  ready_for_pickup: { to: "completed", label: "Picked Up / Entregado" },
  shipped: { to: "completed", label: "Delivered / Entregado" },
  completed: null, cancelled: null,
};
const BADGE: Record<string, string> = {
  pending_payment: "bg-caution-400/15 text-caution-400",
  paid: "bg-confirm-500/15 text-confirm-500",
  ready_for_pickup: "bg-steel-300/15 text-steel-300",
  shipped: "bg-steel-300/15 text-steel-300",
  completed: "bg-forge-600 text-steel-400",
  cancelled: "bg-torch-500/15 text-torch-400",
};

export default function OrderBoard() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = () => fetch("/api/admin/orders").then(async (r) => {
    if (r.status === 401) { window.location.href = "/admin"; return; }
    setRows(await r.json());
  });
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  async function advance(o: any) {
    let to = NEXT[o.status]?.to;
    if (o.status === "paid") to = o.fulfillment === "pickup" ? "ready_for_pickup" : "shipped";
    if (!to) return;
    setRows((r) => r!.map((x) => x.id === o.id ? { ...x, status: to } : x));
    await fetch(`/api/admin/orders/${o.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
  }

  async function cancel(o: any) {
    if (!confirm("Cancel this order? / ¿Cancelar este pedido?")) return;
    setRows((r) => r!.map((x) => x.id === o.id ? { ...x, status: "cancelled" } : x));
    await fetch(`/api/admin/orders/${o.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
  }

  if (!rows) return <div className="grid min-h-screen place-items-center text-steel-400">Loading…</div>;
  const active = rows.filter((o) => !["completed", "cancelled"].includes(o.status));
  const done = rows.filter((o) => ["completed", "cancelled"].includes(o.status));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl space-y-3 px-4 py-6">
        {active.length === 0 && <p className="py-12 text-center text-steel-400">No open orders / Sin pedidos abiertos</p>}
        {active.map((o) => <Ticket key={o.id} o={o} advance={advance} cancel={cancel} />)}
        {done.length > 0 && (
          <button onClick={() => setShowDone(!showDone)} className="stamped w-full py-3 hover:text-steel-100">
            {showDone ? "Hide" : "Show"} history ({done.length})
          </button>
        )}
        {showDone && done.map((o) => <Ticket key={o.id} o={o} advance={advance} cancel={cancel} />)}
      </main>
    </>
  );
}

function Ticket({ o, advance, cancel }: any) {
  const next = o.status === "paid"
    ? { label: o.fulfillment === "pickup" ? "Ready for Pickup / Listo" : "Mark Shipped / Enviado" }
    : NEXT[o.status];
  const wa = o.customerPhone?.replace(/\D/g, "");
  return (
    <div className="plate space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="stamped !text-base !text-steel-100">{o.orderNumber}</span>
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${BADGE[o.status]}`}>
          {o.status.replace(/_/g, " ")}
        </span>
        <span className="flex items-center gap-1 text-xs text-steel-400">
          {o.fulfillment === "pickup" ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
          {o.fulfillment} · {o.paymentMethod.replace(/_/g, " ")}
        </span>
        <span className="ml-auto font-mono font-bold text-torch-400">{fmt(o.totalCents)}</span>
      </div>
      <div className="text-sm text-steel-300">
        {o.customerName} ·{" "}
        <a href={`https://wa.me/${wa}`} target="_blank"
          className="inline-flex items-center gap-1 text-confirm-500 hover:underline">
          <MessageCircle className="h-3.5 w-3.5" />{o.customerPhone}
        </a>
        {o.shipAddress && <span className="text-steel-400"> · {o.shipAddress.line1}, {o.shipAddress.city} {o.shipAddress.state} {o.shipAddress.zip}</span>}
      </div>
      <ul className="text-sm text-steel-400">
        {o.items.map((i: any) => (
          <li key={i.id} className="flex justify-between">
            <span>{i.qty}× {i.nameSnapshot}</span>
            <span className="font-mono">{fmt(i.unitPriceCents * i.qty)}</span>
          </li>
        ))}
      </ul>
      {next && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => advance(o)} className="btn-torch flex-1 px-4 py-2.5">{next.label}</button>
          {o.status === "pending_payment" && (
            <button onClick={() => cancel(o)} className="plate px-4 text-xs text-steel-400 hover:text-torch-400">
              Cancel / Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
