import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/settingsCrypto";

type StripeRow = {
  enabled?: boolean;
  secretKeyEncrypted?: string | null;
  webhookSecretEncrypted?: string | null;
};

type PaypalRow = {
  enabled?: boolean;
  env?: "sandbox" | "live";
  clientId?: string | null;
  clientSecretEncrypted?: string | null;
};

async function readRows() {
  const rows = await db.select().from(settings).where(inArray(settings.key, ["stripe_config", "paypal_config"]));
  return {
    stripe: (rows.find((r) => r.key === "stripe_config")?.value ?? {}) as StripeRow,
    paypal: (rows.find((r) => r.key === "paypal_config")?.value ?? {}) as PaypalRow,
  };
}

// Full decrypted config — server-only, used by checkout/webhook code. Never
// send this over the wire.
export async function getPaymentConfig() {
  const { stripe, paypal } = await readRows();
  return {
    stripe: {
      enabled: stripe.enabled === true,
      secretKey: stripe.secretKeyEncrypted ? decryptSecret(stripe.secretKeyEncrypted) : null,
      webhookSecret: stripe.webhookSecretEncrypted ? decryptSecret(stripe.webhookSecretEncrypted) : null,
    },
    paypal: {
      enabled: paypal.enabled === true,
      env: paypal.env === "live" ? "live" as const : "sandbox" as const,
      clientId: paypal.clientId ?? null,
      clientSecret: paypal.clientSecretEncrypted ? decryptSecret(paypal.clientSecretEncrypted) : null,
    },
  };
}

// Enabled flags only — safe to expose to the public checkout page.
export async function getPaymentStatus() {
  const { stripe, paypal } = await readRows();
  return {
    stripeEnabled: stripe.enabled === true && !!stripe.secretKeyEncrypted,
    paypalEnabled: paypal.enabled === true && !!paypal.clientId && !!paypal.clientSecretEncrypted,
  };
}

// Admin view — masks secrets as booleans so they're never sent back to the browser.
export async function getPaymentAdminView() {
  const { stripe, paypal } = await readRows();
  return {
    stripe: {
      enabled: stripe.enabled === true,
      hasSecretKey: !!stripe.secretKeyEncrypted,
      hasWebhookSecret: !!stripe.webhookSecretEncrypted,
    },
    paypal: {
      enabled: paypal.enabled === true,
      env: paypal.env === "live" ? "live" as const : "sandbox" as const,
      clientId: paypal.clientId ?? "",
      hasClientSecret: !!paypal.clientSecretEncrypted,
    },
  };
}

export async function savePaymentConfig(input: {
  stripe: { enabled: boolean; secretKey?: string; webhookSecret?: string };
  paypal: { enabled: boolean; env: "sandbox" | "live"; clientId?: string; clientSecret?: string };
}) {
  const { stripe: existingStripe, paypal: existingPaypal } = await readRows();

  const stripeValue: StripeRow = {
    enabled: input.stripe.enabled,
    secretKeyEncrypted: input.stripe.secretKey
      ? encryptSecret(input.stripe.secretKey)
      : existingStripe.secretKeyEncrypted ?? null,
    webhookSecretEncrypted: input.stripe.webhookSecret
      ? encryptSecret(input.stripe.webhookSecret)
      : existingStripe.webhookSecretEncrypted ?? null,
  };

  const paypalValue: PaypalRow = {
    enabled: input.paypal.enabled,
    env: input.paypal.env,
    clientId: input.paypal.clientId?.trim() || existingPaypal.clientId || null,
    clientSecretEncrypted: input.paypal.clientSecret
      ? encryptSecret(input.paypal.clientSecret)
      : existingPaypal.clientSecretEncrypted ?? null,
  };

  const updatedAt = new Date();
  await db.insert(settings).values([
    { key: "stripe_config", value: stripeValue, updatedAt },
    { key: "paypal_config", value: paypalValue, updatedAt },
  ]).onConflictDoUpdate({
    target: settings.key,
    set: { value: sql`excluded.value`, updatedAt },
  });
}

export async function clearPaymentSecret(kind: "stripe_key" | "stripe_webhook" | "paypal_secret") {
  const { stripe, paypal } = await readRows();
  const updatedAt = new Date();

  if (kind === "stripe_key" || kind === "stripe_webhook") {
    const next: StripeRow = { ...stripe };
    if (kind === "stripe_key") next.secretKeyEncrypted = null;
    if (kind === "stripe_webhook") next.webhookSecretEncrypted = null;
    await db.insert(settings).values({ key: "stripe_config", value: next, updatedAt })
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt } });
  } else {
    const next: PaypalRow = { ...paypal, clientSecretEncrypted: null };
    await db.insert(settings).values({ key: "paypal_config", value: next, updatedAt })
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt } });
  }
}
