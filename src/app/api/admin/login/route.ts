import { NextResponse } from "next/server";
import { verifyPin, createSession } from "@/lib/adminAuth";

const attempts = new Map<string, { n: number; reset: number }>(); // basic brute-force brake

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const a = attempts.get(ip);
  if (a && a.n >= 5 && Date.now() < a.reset)
    return NextResponse.json({ error: "locked" }, { status: 429 });

  const { pin } = await req.json();
  const role = verifyPin(String(pin ?? ""));
  if (role) {
    attempts.delete(ip);
    await createSession(role);
    return NextResponse.json({ ok: true, role });
  }
  const cur = a && Date.now() < a.reset ? a : { n: 0, reset: Date.now() + 10 * 60_000 };
  attempts.set(ip, { n: cur.n + 1, reset: cur.reset });
  return NextResponse.json({ error: "wrong pin" }, { status: 401 });
}
