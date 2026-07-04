import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "jr_admin";
const secret = () => process.env.ADMIN_PIN! + "|jr-session-salt";

export type AdminRole = "master" | "owner";

function sign(exp: number, role: AdminRole) {
  const payload = `${exp}.${role}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function pinMatches(candidate: string, expected: string) {
  if (!expected || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

// Master PIN (ADMIN_PIN) gets full access, including store settings/branding.
// Store PIN (STORE_PIN) is for the day-to-day owner: products and orders only.
export function verifyPin(pin: string): AdminRole | null {
  if (pinMatches(pin, process.env.ADMIN_PIN ?? "")) return "master";
  if (pinMatches(pin, process.env.STORE_PIN ?? "")) return "owner";
  return null;
}

export async function createSession(role: AdminRole) {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12h shift — kitchen hours
  (await cookies()).set(COOKIE, sign(exp, role), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, path: "/",
  });
}

async function session(): Promise<AdminRole | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [expStr, role, mac] = raw.split(".");
  if (role !== "master" && role !== "owner") return null;
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return null;
  const good = createHmac("sha256", secret()).update(`${expStr}.${role}`).digest("hex");
  try {
    if (!mac || !timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  } catch { return null; }
  return role;
}

export async function getAdminRole() {
  return session();
}

export async function isAdmin() {
  return (await session()) !== null;
}

export async function isMasterAdmin() {
  return (await session()) === "master";
}
