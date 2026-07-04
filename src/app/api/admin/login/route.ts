import { NextResponse } from "next/server";
import { verifyPin, createSession } from "@/lib/adminAuth";

const attempts = new Map<string, { n: number; reset: number }>(); // basic brute-force brake

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const a = attempts.get(ip);
  if (a && a.n >= 5 && Date.now() < a.reset)
    return NextResponse.json({ error: "locked" }, { status: 429 });

  const { pin } = await req.json();
  if (verifyPin(String(pin ?? ""))) {
    attempts.delete(ip);
    await createSession();
    return NextResponse.json({ ok: true });
  }
  const cur = a && Date.now() < a.reset ? a : { n: 0, reset: Date.now() + 10 * 60_000 };
  attempts.set(ip, { n: cur.n + 1, reset: cur.reset });
  return NextResponse.json({ error: "wrong pin" }, { status: 401 });
}
