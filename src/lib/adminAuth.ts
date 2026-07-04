import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "jr_admin";
const secret = () => process.env.ADMIN_PIN! + "|jr-session-salt";

function sign(exp: number) {
  const mac = createHmac("sha256", secret()).update(String(exp)).digest("hex");
  return `${exp}.${mac}`;
}

export function verifyPin(pin: string) {
  const expected = process.env.ADMIN_PIN ?? "";
  if (!expected || pin.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
}

export async function createSession() {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12h shift — kitchen hours
  (await cookies()).set(COOKIE, sign(exp), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, path: "/",
  });
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [expStr, mac] = raw.split(".");
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;
  const good = createHmac("sha256", secret()).update(expStr).digest("hex");
  try { return timingSafeEqual(Buffer.from(mac), Buffer.from(good)); } catch { return false; }
}
