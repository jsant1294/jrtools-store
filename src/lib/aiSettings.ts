import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/settingsCrypto";

type AiRow = {
  enabled?: boolean;
  apiKeyEncrypted?: string | null;
};

async function readRow(): Promise<AiRow> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "ai_config"));
  return (row?.value ?? {}) as AiRow;
}

// Server-only, decrypted — resolves the store's own key first, falling back
// to the platform's shared key (the "sandbox" tier) when the owner hasn't
// wired their own. Never send this over the wire.
export async function getAiConfig() {
  const row = await readRow();
  const ownKey = row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null;
  const apiKey = ownKey ?? process.env.ANTHROPIC_API_KEY ?? null;
  return {
    enabled: row.enabled !== false && !!apiKey, // default on when a key resolves, unless explicitly turned off
    apiKey,
    usingOwnKey: !!ownKey,
  };
}

// Admin view — masks the key as a boolean, never returns it.
export async function getAiAdminView() {
  const row = await readRow();
  return {
    enabled: row.enabled !== false,
    hasOwnKey: !!row.apiKeyEncrypted,
    hasPlatformKey: !!process.env.ANTHROPIC_API_KEY,
  };
}

export async function saveAiConfig(input: { enabled: boolean; apiKey?: string }) {
  const existing = await readRow();
  const value: AiRow = {
    enabled: input.enabled,
    apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : existing.apiKeyEncrypted ?? null,
  };
  const updatedAt = new Date();
  await db.insert(settings).values({ key: "ai_config", value, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt } });
}

export async function clearAiKey() {
  const existing = await readRow();
  const updatedAt = new Date();
  await db.insert(settings).values({ key: "ai_config", value: { ...existing, apiKeyEncrypted: null }, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt } });
}
