"use client";
// Payment wiring — Stripe and PayPal credentials, stored encrypted in the DB.
// Owner-accessible: the store owner holds the actual merchant accounts, so
// they connect their own keys here without needing the master admin or a
// Vercel CLI session.
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Save, ShieldCheck, Trash2 } from "lucide-react";

const input = "plate w-full bg-transparent px-3 py-3 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500";
const label = "stamped mb-1 block";

type PaymentsView = {
  stripe: { enabled: boolean; hasSecretKey: boolean; hasWebhookSecret: boolean };
  paypal: { enabled: boolean; env: "sandbox" | "live"; clientId: string; hasClientSecret: boolean };
};

export default function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [hasStripeKey, setHasStripeKey] = useState(false);
  const [hasStripeWebhook, setHasStripeWebhook] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalEnv, setPaypalEnv] = useState<"sandbox" | "live">("sandbox");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [hasPaypalSecret, setHasPaypalSecret] = useState(false);
  const [paypalClientSecret, setPaypalClientSecret] = useState("");

  function load() {
    fetch("/api/admin/payments").then(async (r) => {
      if (r.status === 401) { window.location.href = "/admin"; return; }
      const data: PaymentsView = await r.json();
      setStripeEnabled(data.stripe.enabled);
      setHasStripeKey(data.stripe.hasSecretKey);
      setHasStripeWebhook(data.stripe.hasWebhookSecret);
      setPaypalEnabled(data.paypal.enabled);
      setPaypalEnv(data.paypal.env);
      setPaypalClientId(data.paypal.clientId);
      setHasPaypalSecret(data.paypal.hasClientSecret);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    const res = await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stripe: {
          enabled: stripeEnabled,
          secretKey: stripeSecretKey.trim() || undefined,
          webhookSecret: stripeWebhookSecret.trim() || undefined,
        },
        paypal: {
          enabled: paypalEnabled,
          env: paypalEnv,
          clientId: paypalClientId.trim() || undefined,
          clientSecret: paypalClientSecret.trim() || undefined,
        },
      }),
    });
    if (res.ok) {
      setStripeSecretKey(""); setStripeWebhookSecret(""); setPaypalClientSecret("");
      setSaved(true);
      load();
    } else setErr("Save failed / No se pudo guardar");
    setSaving(false);
  }

  async function clearSecret(field: "stripe_key" | "stripe_webhook" | "paypal_secret") {
    if (!confirm("Remove this credential? / ¿Quitar esta credencial?")) return;
    const res = await fetch(`/api/admin/payments?field=${field}`, { method: "DELETE" });
    if (res.ok) load();
    else setErr("Remove failed / No se pudo quitar");
  }

  if (loading) return <div className="grid min-h-screen place-items-center text-steel-400">Loading...</div>;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase">Payments / Pagos</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-steel-400">
            <ShieldCheck className="h-4 w-4 text-confirm-500" />
            Stored encrypted. Use your own Stripe/PayPal dashboard to get these keys. / Guardado cifrado. Obtén estas claves en tu panel de Stripe/PayPal.
          </p>
        </div>

        <section className="plate space-y-4 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">Stripe (Card Payments / Tarjeta)</p>
            <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-steel-300">
              <input type="checkbox" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} className="h-5 w-5" />
              {stripeEnabled ? "On" : "Off"}
            </label>
          </div>

          <div>
            <span className={label}>Secret Key {hasStripeKey && <span className="text-confirm-500">(saved)</span>}</span>
            <div className="flex gap-2">
              <input className={input} type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder={hasStripeKey ? "•••••••••••••• (leave blank to keep)" : "sk_live_..."} />
              {hasStripeKey && (
                <button type="button" onClick={() => clearSecret("stripe_key")} className="plate px-3 text-torch-400 hover:border-torch-500" aria-label="Remove Stripe secret key">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className={label}>Webhook Secret {hasStripeWebhook && <span className="text-confirm-500">(saved)</span>}</span>
            <div className="flex gap-2">
              <input className={input} type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder={hasStripeWebhook ? "•••••••••••••• (leave blank to keep)" : "whsec_..."} />
              {hasStripeWebhook && (
                <button type="button" onClick={() => clearSecret("stripe_webhook")} className="plate px-3 text-torch-400 hover:border-torch-500" aria-label="Remove Stripe webhook secret">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="plate space-y-4 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">PayPal</p>
            <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-steel-300">
              <input type="checkbox" checked={paypalEnabled} onChange={(e) => setPaypalEnabled(e.target.checked)} className="h-5 w-5" />
              {paypalEnabled ? "On" : "Off"}
            </label>
          </div>

          <div>
            <span className={label}>Environment / Ambiente</span>
            <select className={input} value={paypalEnv} onChange={(e) => setPaypalEnv(e.target.value as "sandbox" | "live")}>
              <option value="sandbox">Sandbox (testing / pruebas)</option>
              <option value="live">Live (real money / dinero real)</option>
            </select>
          </div>

          <div>
            <span className={label}>Client ID</span>
            <input className={input} value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="AY..." />
          </div>

          <div>
            <span className={label}>Client Secret {hasPaypalSecret && <span className="text-confirm-500">(saved)</span>}</span>
            <div className="flex gap-2">
              <input className={input} type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)}
                placeholder={hasPaypalSecret ? "•••••••••••••• (leave blank to keep)" : "EL..."} />
              {hasPaypalSecret && (
                <button type="button" onClick={() => clearSecret("paypal_secret")} className="plate px-3 text-torch-400 hover:border-torch-500" aria-label="Remove PayPal client secret">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {err && <p className="text-sm text-torch-400">{err}</p>}
        {saved && <p className="text-sm text-confirm-500">Saved / Guardado</p>}

        <button onClick={save} disabled={saving}
          className="btn-torch flex w-full items-center justify-center gap-2 px-4 py-4 text-lg disabled:opacity-40">
          <Save className="h-5 w-5" /> {saving ? "Saving..." : "Save / Guardar"}
        </button>
      </main>
    </>
  );
}
