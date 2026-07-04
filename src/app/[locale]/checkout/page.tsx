"use client";
// Checkout — cart review, fulfillment selector, payment method, order placement.
// Manual payments create pending_payment orders; the confirmation screen points
// the customer to WhatsApp. Stripe branch activates via env flag in Phase 3.
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCart, fmt } from "@/lib/cart";
import { MapPin, Truck, Trash2, CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  const cart = useCart();
  const t = useTranslations("cart");
  const tc = useTranslations("checkout");
  const tcat = useTranslations("catalog");
  const locale = useLocale();

  const [fulfillment, setFulfillment] = useState<"pickup" | "shipping">("pickup");
  const [payment, setPayment] = useState<"paypal" | "zelle" | "cash_app" | "cash_pickup">("zelle");
  const [form, setForm] = useState({ name: "", phone: "", email: "", line1: "", city: "", state: "GA", zip: "" });
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shippingBlocked = cart.pickupLocked;
  const effFulfillment = shippingBlocked ? "pickup" : fulfillment;
  const shippingCents = effFulfillment === "shipping" ? 1500 : 0;
  const paypalEnabled = process.env.NEXT_PUBLIC_PAYMENTS_PAYPAL_ENABLED === "true";

  useEffect(() => {
    const paid = new URLSearchParams(window.location.search).get("paid");
    if (paid) {
      cart.clear();
      setDone(paid);
    }
  }, []);

  async function placeOrder() {
    setPlacing(true); setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment: effFulfillment,
          paymentMethod: effFulfillment === "pickup" && payment === "cash_pickup" ? "cash_pickup" : payment,
          customerName: form.name, customerPhone: form.phone, customerEmail: form.email,
          locale,
          shipAddress: effFulfillment === "shipping"
            ? { line1: form.line1, city: form.city, state: form.state, zip: form.zip }
            : undefined,
          items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? "Order failed");

      if (payment === "paypal") {
        const paypalRes = await fetch("/api/checkout/paypal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.id }),
        });
        const paypalData = await paypalRes.json();
        if (!paypalRes.ok) throw new Error(paypalData.error?.toString() ?? "PayPal failed");
        window.location.href = paypalData.url;
        return;
      }

      cart.clear();
      setDone(data.orderNumber);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  }

  if (done) return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-confirm-500" />
      <h1 className="mt-4 font-display text-3xl font-bold uppercase text-steel-100">{tc("confirmed")}</h1>
      <p className="stamped mt-2 !text-lg">{done}</p>
      <p className="mt-4 text-steel-300">{tc("manualNote")}</p>
    </main>
  );

  if (cart.items.length === 0) return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center text-steel-400">{t("empty")}</main>
  );

  const input = "plate w-full bg-transparent px-3 py-2.5 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500";

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
      {/* ---- Items ---- */}
      <section>
        <h1 className="mb-4 font-display text-2xl font-bold uppercase text-steel-100">{t("title")}</h1>
        <div className="space-y-3">
          {cart.items.map((i) => (
            <div key={i.productId} className="plate flex items-center gap-3 p-3">
              <div className="h-16 w-16 shrink-0 bg-forge-900">
                {i.imageUrl && <img src={i.imageUrl} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-steel-100">{i.name}</p>
                <p className="font-mono text-sm font-bold text-torch-400">{fmt(i.priceCents, locale)}</p>
                {i.pickupOnly && <p className="stamped !text-caution-400">{tcat("pickupOnly")}</p>}
              </div>
              <div className="flex items-center gap-2">
                <QtyBtn onClick={() => cart.setQty(i.productId, i.qty - 1)}>−</QtyBtn>
                <span className="w-6 text-center font-mono">{i.qty}</span>
                <QtyBtn onClick={() => cart.setQty(i.productId, i.qty + 1)} disabled={i.qty >= i.maxQty}>+</QtyBtn>
              </div>
              <button onClick={() => cart.remove(i.productId)} aria-label={t("remove")}
                className="p-2 text-steel-400 hover:text-torch-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Fulfillment + payment + contact ---- */}
      <aside className="space-y-5">
        <div className="plate space-y-3 p-4">
          <p className="stamped">{t("fulfillment")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={effFulfillment === "pickup"} onClick={() => setFulfillment("pickup")}>
              <MapPin className="h-4 w-4" />{t("pickup")}
            </Toggle>
            <Toggle active={effFulfillment === "shipping"} onClick={() => !shippingBlocked && setFulfillment("shipping")}
              disabled={shippingBlocked}>
              <Truck className="h-4 w-4" />{t("shipping")}
            </Toggle>
          </div>

          <p className="stamped pt-2">{tc("payment")}</p>
          <div className="grid gap-2">
            <Toggle active={payment === "zelle"} onClick={() => setPayment("zelle")}>{tc("zelle")}</Toggle>
            <Toggle active={payment === "cash_app"} onClick={() => setPayment("cash_app")}>{tc("cashApp")}</Toggle>
            {paypalEnabled && (
              <Toggle active={payment === "paypal"} onClick={() => setPayment("paypal")}>{tc("paypal")}</Toggle>
            )}
            {effFulfillment === "pickup" && (
              <Toggle active={payment === "cash_pickup"} onClick={() => setPayment("cash_pickup")}>{tc("cashPickup")}</Toggle>
            )}
            {/* Stripe card option renders here when PAYMENTS_STRIPE_ENABLED=true — Phase 3 */}
          </div>

          <div className="space-y-2 pt-2">
            <input className={input} placeholder="Name / Nombre" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="WhatsApp / Phone" inputMode="tel" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={input} placeholder="Email (optional)" inputMode="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {effFulfillment === "shipping" && (
              <>
                <input className={input} placeholder="Address" value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <input className={input} placeholder="City" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <input className={input} placeholder="ST" maxLength={2} value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                  <input className={input} placeholder="ZIP" inputMode="numeric" value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="plate space-y-2 p-4">
          <Row label={t("subtotal")} value={fmt(cart.subtotalCents, locale)} />
          {shippingCents > 0 && <Row label={t("shipping")} value={fmt(shippingCents, locale)} />}
          <div className="border-t border-forge-600 pt-2">
            <Row label="Total" value={fmt(cart.subtotalCents + shippingCents, locale)} bold />
          </div>
          <p className="text-xs text-steel-400">{tc("manualNote")}</p>
          {error && <p className="text-xs text-torch-400">{error}</p>}
          <button onClick={placeOrder} disabled={placing || !form.name || !form.phone}
            className="btn-torch w-full px-4 py-3 disabled:opacity-40">
            {placing ? "..." : tc("placeOrder")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm(locale === "es" ? "¿Vaciar carrito y empezar de nuevo?" : "Clear cart and start over?")) return;
              cart.clear();
              setForm({ name: "", phone: "", email: "", line1: "", city: "", state: "GA", zip: "" });
              setError(null);
            }}
            className="w-full px-4 py-2 text-xs font-bold uppercase tracking-wide text-steel-400 hover:text-torch-400"
          >
            {tc("startOver")}
          </button>
        </div>
      </aside>
    </main>
  );
}

function QtyBtn({ children, onClick, disabled }: any) {
  return <button onClick={onClick} disabled={disabled}
    className="plate h-8 w-8 font-mono text-steel-100 hover:border-torch-500 disabled:opacity-30">{children}</button>;
}
function Toggle({ active, onClick, disabled, children }: any) {
  return <button onClick={onClick} disabled={disabled}
    className={`plate flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition
      ${active ? "!border-torch-500 bg-torch-500/10 text-torch-400" : "text-steel-300"}
      ${disabled ? "opacity-40" : "hover:border-steel-400"}`}>{children}</button>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between text-sm ${bold ? "font-bold text-steel-100" : "text-steel-300"}`}>
    <span>{label}</span><span className="font-mono">{value}</span></div>;
}
