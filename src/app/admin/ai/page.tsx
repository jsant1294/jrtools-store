"use client";
// AI Assistant wiring — controls both the customer-facing "Ask JR Tools"
// chat upgrade and the admin product Quick Fill. Owner-accessible: bring
// your own Anthropic key for heavier use, or leave it on the store's
// shared default ("sandbox") key.
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Save, ShieldCheck, Trash2 } from "lucide-react";

const input = "plate w-full bg-transparent px-3 py-3 text-steel-100 placeholder-steel-400 outline-none focus:border-torch-500";
const label = "stamped mb-1 block";

export default function AdminAi() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [hasPlatformKey, setHasPlatformKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  function load() {
    fetch("/api/admin/ai").then(async (r) => {
      if (r.status === 401) { window.location.href = "/admin"; return; }
      const data = await r.json();
      setEnabled(data.enabled);
      setHasOwnKey(data.hasOwnKey);
      setHasPlatformKey(data.hasPlatformKey);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    const res = await fetch("/api/admin/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, apiKey: apiKey.trim() || undefined }),
    });
    if (res.ok) { setApiKey(""); setSaved(true); load(); }
    else setErr("Save failed / No se pudo guardar");
    setSaving(false);
  }

  async function clearOwnKey() {
    if (!confirm("Remove your own API key? The store will fall back to the shared default key. / ¿Quitar tu clave? La tienda usará la clave compartida por defecto.")) return;
    const res = await fetch("/api/admin/ai", { method: "DELETE" });
    if (res.ok) load();
    else setErr("Remove failed / No se pudo quitar");
  }

  if (loading) return <div className="grid min-h-screen place-items-center text-steel-400">Loading...</div>;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase">AI Assistant / Asistente IA</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-steel-400">
            <ShieldCheck className="h-4 w-4 text-confirm-500" />
            Powers the "Ask JR Tools" chat and the product Quick Fill button. Stored encrypted. / Impulsa el chat "Ask JR Tools" y el botón de autocompletar productos. Guardado cifrado.
          </p>
        </div>

        <section className="plate space-y-4 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-steel-100">AI Features / Funciones de IA</p>
            <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-steel-300">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5" />
              {enabled ? "On" : "Off"}
            </label>
          </div>

          <div className="plate flex items-center gap-3 p-3 text-sm">
            <span className={`h-2 w-2 rounded-full ${hasOwnKey ? "bg-confirm-500" : hasPlatformKey ? "bg-caution-400" : "bg-torch-500"}`} />
            <p className="text-steel-300">
              {hasOwnKey
                ? "Using your own Anthropic API key. / Usando tu propia clave de Anthropic."
                : hasPlatformKey
                  ? "Using the store's shared default key. / Usando la clave compartida por defecto de la tienda."
                  : "No API key available — AI features are off until one is set. / No hay clave disponible — las funciones de IA están apagadas."}
            </p>
          </div>

          <div>
            <span className={label}>Your Own Anthropic API Key {hasOwnKey && <span className="text-confirm-500">(saved)</span>}</span>
            <div className="flex gap-2">
              <input className={input} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasOwnKey ? "•••••••••••••• (leave blank to keep)" : "sk-ant-..."} />
              {hasOwnKey && (
                <button type="button" onClick={clearOwnKey} className="plate px-3 text-torch-400 hover:border-torch-500" aria-label="Remove your API key">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-steel-400">
              Optional. Leave blank to keep using the store's shared key. Get your own at console.anthropic.com if you want dedicated capacity. / Opcional. Déjalo en blanco para seguir usando la clave compartida. Consigue la tuya en console.anthropic.com si quieres capacidad dedicada.
            </p>
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
