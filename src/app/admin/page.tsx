"use client";
// Admin entry — a phone-style keypad, not a login form. Big targets,
// bilingual labels baked in. Correct PIN sets the session cookie and
// forwards to /admin/products.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Wrench } from "lucide-react";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const router = useRouter();

  async function submit(candidate: string) {
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: candidate }),
    });
    if (res.ok) { router.push("/admin/products"); return; }
    if (res.status === 429) setLocked(true);
    setPin(""); setShake(true); setTimeout(() => setShake(false), 500);
  }

  function press(d: string) {
    if (locked) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) submit(next);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className={`plate w-full max-w-xs p-6 text-center ${shake ? "animate-[shake_0.4s]" : ""}`}>
        <Wrench className="mx-auto h-8 w-8 text-torch-500" />
        <h1 className="mt-2 font-display text-xl font-bold uppercase tracking-wider">JR Tools Admin</h1>
        <p className="stamped mt-1">Enter PIN / Ingresa el PIN</p>

        <div className="my-5 flex justify-center gap-2">
          {[...Array(6)].map((_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-torch-500" : "bg-forge-600"}`} />
          ))}
        </div>

        {locked ? (
          <p className="text-sm text-torch-400">Too many tries. Wait 10 min. / Demasiados intentos. Espera 10 min.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <Key key={d} onClick={() => press(d)}>{d}</Key>
            ))}
            <span />
            <Key onClick={() => press("0")}>0</Key>
            <Key onClick={() => setPin(pin.slice(0, -1))}><Delete className="mx-auto h-5 w-5" /></Key>
          </div>
        )}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </main>
  );
}

function Key({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="plate h-14 font-mono text-xl font-bold text-steel-100 transition hover:border-torch-500 active:bg-forge-600">
      {children}
    </button>
  );
}
