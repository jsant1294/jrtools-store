"use client";
// Floating assistant — torch-red wrench button, slide-up chat panel.
// Same UI whether the backend is FAQ mode or full Claude mode.
import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Wrench } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";

type Msg = { role: "user" | "assistant"; text: string };

export function AssistantWidget() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, locale, pathname }),
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMsgs((m) => [...m, { role: "assistant", text: data.reply ?? "…" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Connection issue — try again. / Problema de conexión — intenta de nuevo." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label={t("title")}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-torch-500 shadow-lg shadow-black/40 transition hover:bg-torch-400">
        {open ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}
      </button>

      {open && (
        <div className="plate fixed bottom-24 right-5 z-50 flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-forge-600 bg-forge-700 px-4 py-3">
            <Wrench className="h-4 w-4 text-torch-500" />
            <span className="font-display font-bold uppercase tracking-wide">{t("title")}</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && <p className="text-sm text-steel-400">{t("greeting")}</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-torch-500/20 text-steel-100" : "bg-forge-700 text-steel-300"}`}>
                {m.text}
              </div>
            ))}
            {busy && <div className="w-14 rounded bg-forge-700 px-3 py-2 text-sm text-steel-400">…</div>}
            <div ref={bottom} />
          </div>
          <div className="flex gap-2 border-t border-forge-600 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("placeholder")}
              className="flex-1 bg-transparent text-sm text-steel-100 placeholder-steel-400 outline-none" />
            <button onClick={send} disabled={busy || !input.trim()} aria-label="Send"
              className="grid h-9 w-9 place-items-center rounded bg-torch-500 disabled:opacity-40">
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
