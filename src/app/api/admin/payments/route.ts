import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { clearPaymentSecret, getPaymentAdminView, savePaymentConfig } from "@/lib/paymentSettings";
import { z } from "zod";

// Accessible to both master and store owner — the owner is the one with the
// actual Stripe/PayPal business account, so they wire their own credentials.
const PaymentsInput = z.object({
  stripe: z.object({
    enabled: z.boolean(),
    secretKey: z.string().trim().optional(),
    webhookSecret: z.string().trim().optional(),
  }),
  paypal: z.object({
    enabled: z.boolean(),
    env: z.enum(["sandbox", "live"]),
    clientId: z.string().trim().optional(),
    clientSecret: z.string().trim().optional(),
  }),
});

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getPaymentAdminView());
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PaymentsInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await savePaymentConfig(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = new URL(req.url).searchParams.get("field");
  if (kind !== "stripe_key" && kind !== "stripe_webhook" && kind !== "paypal_secret") {
    return NextResponse.json({ error: "bad field" }, { status: 400 });
  }
  await clearPaymentSecret(kind);
  return NextResponse.json({ ok: true });
}
