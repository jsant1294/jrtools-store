// Two-mode assistant:
//   MODE A (default, free): deterministic FAQ + live product retrieval.
//   MODE B (optional): the store's AI config (Admin > AI Assistant) resolves
//   an API key — the owner's own, or the platform's shared "sandbox" key —
//   and lets Claude answer from the SAME faq table + live product list.
// The widget UI never changes between modes.
import { NextResponse } from "next/server";
import { db } from "@/db";
import { faqs, assistantLogs, products } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { getAiConfig } from "@/lib/aiSettings";

function norm(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function words(text: string) {
  return norm(text).split(/\W+/).filter((w) => w.length > 3);
}

function money(cents: number, es: boolean) {
  return new Intl.NumberFormat(es ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function POST(req: Request) {
  const { message, sessionId, locale = "en" } = await req.json();
  if (!message || typeof message !== "string" || message.length > 500)
    return NextResponse.json({ error: "bad message" }, { status: 400 });

  const sid = String(sessionId ?? crypto.randomUUID());
  await db.insert(assistantLogs).values({ sessionId: sid, role: "user", content: message });

  const [rows, inv] = await Promise.all([
    db.select().from(faqs).where(eq(faqs.active, true)),
    db.select().from(products).where(ne(products.stockStatus, "hidden")),
  ]);
  const es = locale === "es";

  // ---- Score FAQs by keyword overlap ----
  const terms = words(message);
  let best: { row: typeof rows[0]; score: number } | null = null;
  for (const row of rows) {
    const keys = norm(row.keywords ?? "").split(",").map((k) => k.trim());
    const hay = [...keys, ...words(es ? row.questionEs : row.questionEn)];
    const score = terms.filter((w) => hay.some((h) => h === w || (w.length > 4 && h.includes(w)))).length;
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }

  // ---- Score visible products from the same inventory shown on the page ----
  const productMatches = inv
    .map((p) => {
      const hay = words([
        p.sku,
        p.nameEn,
        p.nameEs,
        p.descriptionEn ?? "",
        p.descriptionEs ?? "",
        p.condition ?? "",
        p.stockStatus,
      ].join(" "));
      const score = terms.filter((w) => hay.some((h) => h === w || (w.length > 4 && h.includes(w)))).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // ---- MODE B: Claude salesman ----
  const aiConfig = await getAiConfig();
  if (aiConfig.enabled && aiConfig.apiKey) {
    const inStock = inv.filter((p) => p.stockStatus === "in_stock" || p.stockStatus === "pickup_only")
      .map((p) => `- ${es ? p.nameEs : p.nameEn}: $${(p.priceCents / 100).toFixed(2)}${p.stockStatus === "pickup_only" ? " (pickup only)" : ""}`)
      .slice(0, 100).join("\n");
    const faqBlock = rows.map((r) => `Q: ${es ? r.questionEs : r.questionEn}\nA: ${es ? r.answerEs : r.answerEn}`).join("\n\n");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": aiConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: `You are the friendly bilingual sales assistant for JR Tools USA, a professional tool reseller in Alpharetta, GA (local pickup + nationwide shipping). Respond in ${es ? "Spanish" : "English"}. Be brief, warm, and helpful — like a knowledgeable counter guy. Recommend specific in-stock tools when relevant. Never invent products, prices, or policies: use ONLY the inventory and FAQ below. If you don't know, say so and point them to WhatsApp.\n\nCURRENT INVENTORY:\n${inStock}\n\nSTORE FAQ:\n${faqBlock}`,
        messages: [{ role: "user", content: message }],
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
      await db.insert(assistantLogs).values({ sessionId: sid, role: "assistant", content: text, matchedFaqId: best?.row.id ?? null });
      return NextResponse.json({ reply: text, sessionId: sid, mode: "ai" });
    }
    // fall through to FAQ mode on API error — the widget never breaks
  }

  // ---- MODE A: local bilingual page/catalog retrieval ----
  const productReply = productMatches.length
    ? productMatches.map(({ p }) => {
        const status = p.stockStatus === "pickup_only"
          ? (es ? "solo recogida" : "pickup only")
          : p.stockStatus === "out_of_stock"
            ? (es ? "agotado" : "sold out")
            : (es ? "disponible" : "in stock");
        return `- ${es ? p.nameEs : p.nameEn} (${p.sku}) — ${money(p.priceCents, es)}, ${status}`;
      }).join("\n")
    : "";

  const faqReply = best ? (es ? best.row.answerEs : best.row.answerEn) : "";
  const reply = productReply && faqReply
    ? `${productReply}\n\n${faqReply}`
    : productReply
      ? `${es ? "Encontré esto en el inventario:" : "I found this in the inventory:"}\n${productReply}`
      : faqReply || (es
          ? "Buena pregunta. Puedo ayudar con inventario, precios, recogida, envíos, pagos y devoluciones. También puedes escribirnos por WhatsApp."
          : "Good question. I can help with inventory, prices, pickup, shipping, payments, and returns. You can also message us on WhatsApp.");
  await db.insert(assistantLogs).values({ sessionId: sid, role: "assistant", content: reply, matchedFaqId: best?.row.id ?? null });
  return NextResponse.json({ reply, sessionId: sid, mode: "local" });
}
