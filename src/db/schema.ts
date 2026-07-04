// ============================================================
// JR TOOLS USA — Drizzle Schema (Neon Postgres)
// Phase 1 foundation. Every feature in the brief maps to a table here.
// ============================================================
import {
  pgTable, text, integer, boolean, timestamp,
  uuid, pgEnum, index, jsonb, primaryKey,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const stockStatusEnum = pgEnum("stock_status", [
  "in_stock",      // ready to sell, ship or pickup
  "pickup_only",   // inconsistent inventory: on the shelf but won't ship
  "out_of_stock",  // visible but not purchasable (keeps SEO + "notify me" later)
  "hidden",        // admin staging — not on the storefront
]);

export const fulfillmentEnum = pgEnum("fulfillment_type", ["pickup", "shipping"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment", // manual methods (Zelle / cash) await confirmation
  "paid",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "stripe",        // wired, enabled via env flag PAYMENTS_STRIPE_ENABLED
  "zelle",
  "cash_app",
  "cash_pickup",
  "paypal",        // Phase 2 — enum slot reserved so no migration needed later
]);

// ---------- Brands (Milwaukee, DeWalt, Makita, Bosch...) ----------
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"), // optional — product photos carry brand identity legally
  sortOrder: integer("sort_order").default(0),
});

// ---------- Categories (tool TYPE: drills, saws, compressors...) ----------
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameEs: text("name_es").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"), // lucide icon name for category chips
  sortOrder: integer("sort_order").default(0),
});

// ---------- Products ----------
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(), // stamped part-number energy: JR-MIL-0042
  slug: text("slug").notNull().unique(),

  nameEn: text("name_en").notNull(),
  nameEs: text("name_es").notNull(),
  descriptionEn: text("description_en"),
  descriptionEs: text("description_es"),

  brandId: uuid("brand_id").references(() => brands.id),
  categoryId: uuid("category_id").references(() => categories.id),

  priceCents: integer("price_cents").notNull(),
  compareAtCents: integer("compare_at_cents"), // strike-through "deal" price
  condition: text("condition").default("new"), // new | open_box | refurbished | used

  stockStatus: stockStatusEnum("stock_status").default("hidden").notNull(),
  quantity: integer("quantity").default(0),
  allowShipping: boolean("allow_shipping").default(true),
  weightOz: integer("weight_oz"), // for shipping estimates later

  specs: jsonb("specs").$type<Record<string, string>>(), // voltage, chuck size, etc.
  featured: boolean("featured").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_products_brand").on(t.brandId),
  index("idx_products_category").on(t.categoryId),
  index("idx_products_status").on(t.stockStatus),
]);

// ---------- Product Images (the 4-image modal rotator) ----------
export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),          // Vercel Blob URL
  altEn: text("alt_en"),
  altEs: text("alt_es"),
  position: integer("position").default(0).notNull(), // 0..3 for the rotator
  source: text("source").default("upload"),           // upload | camera | unsplash
}, (t) => [index("idx_images_product").on(t.productId)]);

// ---------- Orders ----------
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(), // JR-100001
  status: orderStatusEnum("status").default("pending_payment").notNull(),
  fulfillment: fulfillmentEnum("fulfillment").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),

  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(), // primary channel — WhatsApp culture
  customerEmail: text("customer_email"),
  locale: text("locale").default("en"),

  // shipping only when fulfillment = shipping
  shipAddress: jsonb("ship_address").$type<{
    line1: string; line2?: string; city: string; state: string; zip: string;
  }>(),

  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").default(0),
  taxCents: integer("tax_cents").default(0),
  totalCents: integer("total_cents").notNull(),

  stripeSessionId: text("stripe_session_id"),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(), // snapshot at purchase time
  nameSnapshot: text("name_snapshot").notNull(),
}, (t) => [index("idx_items_order").on(t.orderId), index("idx_items_product").on(t.productId)]);

// ---------- Co-purchase pairs (real "customers also bought", fed by orders) ----------
// Heuristic engine uses brand+category+price band until this table has data,
// then this takes over automatically. No UI change needed.
export const coPurchases = pgTable("co_purchases", {
  productA: uuid("product_a").references(() => products.id, { onDelete: "cascade" }).notNull(),
  productB: uuid("product_b").references(() => products.id, { onDelete: "cascade" }).notNull(),
  count: integer("count").default(1).notNull(),
}, (t) => [primaryKey({ columns: [t.productA, t.productB] }), index("idx_copurchase_a").on(t.productA)]);

// ---------- FAQ / RAG feed for the assistant widget ----------
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionEn: text("question_en").notNull(),
  questionEs: text("question_es").notNull(),
  answerEn: text("answer_en").notNull(),
  answerEs: text("answer_es").notNull(),
  keywords: text("keywords"), // comma-separated retrieval terms: "warranty,garantia,return"
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// ---------- Assistant conversation log (lead capture + future training) ----------
export const assistantLogs = pgTable("assistant_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  matchedFaqId: uuid("matched_faq_id").references(() => faqs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Store settings (hero image, contact, payment toggles) ----------
export const settings = pgTable("settings", {
  key: text("key").primaryKey(), // hero_image_url, whatsapp_number, zelle_info...
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
