# JR TOOLS USA — Complete Storefront (Phases 1–3)

Industrial tool reseller storefront. Bilingual EN/ES, hybrid pickup+shipping,
built for a non-technical operator. "Stamped Steel" design system.

## Stack
Next.js 15 · TypeScript · Tailwind v4 · Drizzle ORM · Neon Postgres · Vercel Blob · next-intl · Stripe (dark)

## What's inside
**Storefront**
- Diamond-plate hero (Unsplash placeholder, admin-swappable via settings table)
- Catalog: instant search (name/SKU/brand/type/description) + brand & tool-type filter chips
- Product modal: 4-image rotator (auto/swipe/keys), specs, stamped SKU, "customers also bought"
- Recommendation engine: heuristic day one → real co-purchase data auto-takeover
- Persistent cart with pickup-lock logic; checkout with Zelle / Cash App / cash-at-pickup
- Bilingual EN/ES throughout (native Spanish, not translated Spanish)

**Admin (/admin)**
- 6-digit PIN keypad login (HMAC cookie session, 12h, brute-force brake)
- Products: one-tap stock status cycling, +/- quantity, search
- Editor: camera capture + drag-drop images (4-slot), auto-slug, bilingual fields
- Order board: expediter tickets, one-button status advance, WhatsApp deep links, 30s auto-refresh

**Assistant widget**
- Launch mode (free): keyword FAQ retrieval from the faqs table
- Salesman mode: set ANTHROPIC_API_KEY → Claude Haiku, grounded in live inventory + FAQs. Same UI.
- Every conversation logged to assistant_logs (lead signal)

**Payments**
- Manual methods live day one (order instructions, confirmed via WhatsApp)
- Stripe fully wired but dark: flip PAYMENTS_STRIPE_ENABLED=true, add keys, register webhook. Done.
- PayPal enum slot reserved (no migration needed later)

## Setup
1. `npm install`
2. `.env.example` → `.env.local` — fill DATABASE_URL (Neon), BLOB_READ_WRITE_TOKEN, ADMIN_PIN (6 digits)
3. `npm run db:push` && `npm run db:seed`
4. `npm run dev` → store at /en and /es, admin at /admin

## Deploy (Vercel)
Import repo → add env vars → deploy. Register Stripe webhook at /api/webhooks/stripe when flipping payments on.

## Operator quickstart (for the hermano)
1. Phone → yoursite.com/admin → PIN
2. "New Product / Nuevo" → Take Photo → name + price + SKU → Save
3. Sold something in person? Tap − on quantity. Out of stock? Tap the status button.
4. Orders tab: tap the big red button to move each order down the line. Tap the phone number to open WhatsApp.
