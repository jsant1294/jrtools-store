// Seed — real brand/category structure + 12 sample products so the store
// demos immediately. Hermano replaces these through the admin as real
// inventory lands. Images use Unsplash tool photos as placeholders.
import { db } from "./index";
import { brands, categories, products, productImages, faqs, settings } from "./schema";
import { eq } from "drizzle-orm";

const U = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`;

type SampleProduct = {
  sku: string; slug: string; nameEn: string; nameEs: string;
  brand: string; cat: string;
  price: number; compare?: number; qty: number;
  pickupOnly?: boolean;
  specs: Record<string, string>;
};

async function main() {
  await db.insert(brands).values([
    { name: "Milwaukee", slug: "milwaukee", sortOrder: 1 },
    { name: "DeWalt", slug: "dewalt", sortOrder: 2 },
    { name: "Makita", slug: "makita", sortOrder: 3 },
    { name: "Bosch", slug: "bosch", sortOrder: 4 },
    { name: "Ryobi", slug: "ryobi", sortOrder: 5 },
  ]).onConflictDoNothing();

  await db.insert(categories).values([
    { nameEn: "Drills & Drivers", nameEs: "Taladros y Atornilladores", slug: "drills", icon: "Drill", sortOrder: 1 },
    { nameEn: "Saws", nameEs: "Sierras", slug: "saws", icon: "Axe", sortOrder: 2 },
    { nameEn: "Batteries & Chargers", nameEs: "Baterías y Cargadores", slug: "batteries", icon: "BatteryCharging", sortOrder: 3 },
    { nameEn: "Hand Tools", nameEs: "Herramienta Manual", slug: "hand-tools", icon: "Hammer", sortOrder: 4 },
    { nameEn: "Accessories", nameEs: "Accesorios", slug: "accessories", icon: "Wrench", sortOrder: 5 },
  ]).onConflictDoNothing();

  const brandRows = await db.select().from(brands);
  const catRows = await db.select().from(categories);

  const b = Object.fromEntries(brandRows.map((r) => [r.slug, r.id]));
  const c = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));

  const sample: SampleProduct[] = [
    { sku: "JR-MIL-0001", slug: "m18-fuel-hammer-drill", nameEn: "M18 FUEL Hammer Drill/Driver Kit", nameEs: "Kit Rotomartillo M18 FUEL", brand: "milwaukee", cat: "drills", price: 19900, compare: 24900, qty: 4, specs: { Voltage: "18V", Chuck: '1/2"', Torque: "1,400 in-lbs" } },
    { sku: "JR-MIL-0002", slug: "m18-xc50-battery-2pk", nameEn: "M18 XC5.0 Battery 2-Pack", nameEs: "Baterías M18 XC5.0 (2 Piezas)", brand: "milwaukee", cat: "batteries", price: 14900, compare: 19900, qty: 8, specs: { Voltage: "18V", Capacity: "5.0Ah" } },
    { sku: "JR-DEW-0003", slug: "dewalt-circular-saw", nameEn: "20V MAX Circular Saw (Tool Only)", nameEs: "Sierra Circular 20V MAX (Solo Herramienta)", brand: "dewalt", cat: "saws", price: 12900, qty: 3, specs: { Blade: '6-1/2"', RPM: "5,150" } },
    { sku: "JR-DEW-0004", slug: "dewalt-impact-driver", nameEn: "ATOMIC 20V Impact Driver Kit", nameEs: "Kit Atornillador de Impacto ATOMIC 20V", brand: "dewalt", cat: "drills", price: 9900, compare: 12900, qty: 6, specs: { Voltage: "20V", Torque: "1,700 in-lbs" } },
    { sku: "JR-MAK-0005", slug: "makita-recip-saw", nameEn: "18V LXT Reciprocating Saw", nameEs: "Sierra Sable 18V LXT", brand: "makita", cat: "saws", price: 11500, qty: 2, pickupOnly: true, specs: { Stroke: '1-1/4"', SPM: "3,000" } },
    { sku: "JR-BOS-0006", slug: "bosch-laser-level", nameEn: "Self-Leveling Cross-Line Laser", nameEs: "Nivel Láser Autonivelante", brand: "bosch", cat: "accessories", price: 8900, qty: 5, specs: { Range: "65 ft", Accuracy: '±1/8"' } },
    { sku: "JR-RYO-0007", slug: "ryobi-drill-combo", nameEn: "ONE+ 18V Drill & Impact Combo", nameEs: "Combo Taladro e Impacto ONE+ 18V", brand: "ryobi", cat: "drills", price: 8900, compare: 11900, qty: 7, specs: { Voltage: "18V" } },
    { sku: "JR-MIL-0008", slug: "milwaukee-packout-box", nameEn: "PACKOUT Rolling Tool Box", nameEs: "Caja Rodante PACKOUT", brand: "milwaukee", cat: "accessories", price: 10900, qty: 3, specs: { Capacity: "250 lbs", Wheels: '9"' } },
    { sku: "JR-DEW-0009", slug: "dewalt-hand-tool-set", nameEn: "Mechanics Tool Set 108-Pc", nameEs: "Juego Mecánico 108 Piezas", brand: "dewalt", cat: "hand-tools", price: 9900, qty: 4, specs: { Pieces: "108", Drive: '1/4" + 3/8"' } },
    { sku: "JR-MAK-0010", slug: "makita-battery-starter", nameEn: "18V LXT Battery Starter Pack", nameEs: "Paquete Inicial Baterías 18V LXT", brand: "makita", cat: "batteries", price: 15900, qty: 5, specs: { Capacity: "4.0Ah x2" } },
    { sku: "JR-MIL-0011", slug: "m12-ratchet", nameEn: "M12 Cordless Ratchet 3/8\"", nameEs: "Matraca Inalámbrica M12 3/8\"", brand: "milwaukee", cat: "hand-tools", price: 13900, qty: 2, specs: { Torque: "35 ft-lbs", Voltage: "12V" } },
    { sku: "JR-BOS-0012", slug: "bosch-drill-bits", nameEn: "Impact Tough Bit Set 40-Pc", nameEs: "Juego de Puntas Impact Tough 40 Piezas", brand: "bosch", cat: "accessories", price: 2900, qty: 15, specs: { Pieces: "40" } },
  ];

  const photoIds = [
    "photo-1504148455328-c376907d081c", "photo-1530124566582-a618bc2615dc",
    "photo-1572981779307-38b8cabb2407", "photo-1426927308491-6380b6a9936f",
  ];

  for (const s of sample) {
    let [p] = await db.insert(products).values({
      sku: s.sku, slug: s.slug, nameEn: s.nameEn, nameEs: s.nameEs,
      descriptionEn: "Pro-grade tool in excellent condition. Message us on WhatsApp for questions or bundle deals.",
      descriptionEs: "Herramienta profesional en excelente condición. Escríbenos por WhatsApp para preguntas o paquetes.",
      brandId: b[s.brand], categoryId: c[s.cat],
      priceCents: s.price, compareAtCents: s.compare ?? null,
      stockStatus: s.pickupOnly ? "pickup_only" : "in_stock",
      quantity: s.qty, allowShipping: !s.pickupOnly,
      specs: s.specs, condition: "new",
    }).onConflictDoNothing().returning();

    if (!p) {
      [p] = await db.select().from(products).where(eq(products.sku, s.sku));
    }

    const existingImages = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, p.id));
    if (existingImages.length === 0) {
      await db.insert(productImages).values(photoIds.map((pid, i) => ({
        productId: p.id, url: U(pid), position: i, source: "unsplash",
        altEn: s.nameEn, altEs: s.nameEs,
      })));
    }
  }

  const existingFaqs = await db.select({ id: faqs.id }).from(faqs);
  if (existingFaqs.length === 0) {
    await db.insert(faqs).values([
      { questionEn: "Where do I pick up my order?", questionEs: "¿Dónde recojo mi pedido?", answerEn: "Local pickup is in Alpharetta, GA. After you order, we confirm the exact address and pickup window by WhatsApp.", answerEs: "La recogida es en Alpharetta, GA. Después de tu pedido, te confirmamos la dirección exacta y el horario por WhatsApp.", keywords: "pickup,recoger,address,direccion,location,donde", sortOrder: 1 },
      { questionEn: "How do I pay with Zelle?", questionEs: "¿Cómo pago con Zelle?", answerEn: "Place your order and choose Zelle. We send payment details by WhatsApp; your order ships or is held for pickup once payment lands.", answerEs: "Haz tu pedido y elige Zelle. Te enviamos los datos por WhatsApp; tu pedido se envía o se aparta al recibir el pago.", keywords: "zelle,pay,pago,payment,transfer", sortOrder: 2 },
      { questionEn: "Are the tools new?", questionEs: "¿Las herramientas son nuevas?", answerEn: "Every listing shows its condition: New, Open Box, Refurbished, or Used. What you see on the tag is what you get.", answerEs: "Cada producto muestra su condición: Nueva, Caja Abierta, Reacondicionada o Usada. Lo que dice la etiqueta es lo que recibes.", keywords: "new,nueva,condition,condicion,used,usada,open box", sortOrder: 3 },
      { questionEn: "Do you ship?", questionEs: "¿Hacen envíos?", answerEn: "Yes - flat $15 shipping nationwide on most items. Some heavy or pickup-only items are marked on the product page.", answerEs: "Si - envio fijo de $15 a todo el pais en la mayoria de articulos. Algunos articulos pesados son solo recogida y estan marcados.", keywords: "ship,envio,shipping,delivery,entrega", sortOrder: 4 },
      { questionEn: "Can I return a tool?", questionEs: "¿Puedo devolver una herramienta?", answerEn: "7-day return window on unused tools in original packaging. Message us on WhatsApp to start a return.", answerEs: "7 dias para devoluciones en herramientas sin usar y en su empaque original. Escribenos por WhatsApp para iniciarla.", keywords: "return,devolver,devolucion,refund,reembolso,warranty,garantia", sortOrder: 5 },
    ]);
  }

  await db.insert(settings).values([
    { key: "hero_image_url", value: { url: null } }, // null = Unsplash default; admin sets real photo
    {
      key: "store_profile",
      value: {
        storeName: "JR Tools USA",
        themePreset: "torch",
        fontPreset: "industrial",
        hero: {
          en: {
            eyebrow: "PROFESSIONAL TOOL DEALS",
            title: "Built to Work.\nPriced to Move.",
            subtitle: "Pro-grade tools from the brands you trust - new, open box, and smart finds. Pick up local or we ship it.",
            cta: "Shop the Inventory",
            promoTitle: "New. Open Box.\nBig Savings.",
            promoBody: "Top brands. Pro quality. Unbeatable prices.",
          },
          es: {
            eyebrow: "OFERTAS EN HERRAMIENTA PROFESIONAL",
            title: "Hechas para Trabajar.\nA Precio de Salida.",
            subtitle: "Herramienta profesional de las marcas de confianza - nueva, open box y buenos hallazgos. Recoge local o te la enviamos.",
            cta: "Ver Inventario",
            promoTitle: "Nueva. Open Box.\nGran Ahorro.",
            promoBody: "Marcas top. Calidad pro. Precios fuertes.",
          },
        },
        toolFeatures: [
          { labelEn: "Drills & Drivers", labelEs: "Taladros y Atornilladores", imageUrl: null },
          { labelEn: "Saws", labelEs: "Sierras", imageUrl: null },
          { labelEn: "Batteries", labelEs: "Baterias", imageUrl: null },
          { labelEn: "Hand Tools", labelEs: "Herramienta Manual", imageUrl: null },
          { labelEn: "Accessories", labelEs: "Accesorios", imageUrl: null },
          { labelEn: "Deals", labelEs: "Ofertas", imageUrl: null },
        ],
      },
    },
    { key: "whatsapp_number", value: { number: "" } },
  ]).onConflictDoNothing();

  console.log("Seeded:", sample.length, "products, 5 brands, 5 categories, 5 FAQs");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
