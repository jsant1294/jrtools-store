const baseUrl = () =>
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function requirePayPalEnv() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (process.env.PAYMENTS_PAYPAL_ENABLED !== "true" || !clientId || !clientSecret) {
    throw new Error("paypal not configured");
  }
  return { clientId, clientSecret };
}

async function accessToken() {
  const { clientId, clientSecret } = requirePayPalEnv();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "paypal auth failed");
  return data.access_token as string;
}

export async function createPayPalOrder({
  orderId,
  orderNumber,
  totalCents,
  locale,
  origin,
}: {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  locale: string | null;
  origin: string;
}) {
  const token = await accessToken();
  const appLocale = locale || "en";

  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: orderId,
        invoice_id: orderNumber,
        custom_id: orderId,
        amount: {
          currency_code: "USD",
          value: (totalCents / 100).toFixed(2),
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "JR Tools USA",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${origin}/api/checkout/paypal/capture?orderId=${orderId}`,
            cancel_url: `${origin}/${appLocale}/checkout?paypal=cancelled`,
          },
        },
      },
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "paypal order failed");

  const approveUrl = data.links?.find((link: { rel: string }) => link.rel === "payer-action")?.href
    ?? data.links?.find((link: { rel: string }) => link.rel === "approve")?.href;
  if (!approveUrl) throw new Error("paypal approve url missing");

  return { paypalOrderId: data.id as string, approveUrl: approveUrl as string };
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const token = await accessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "paypal capture failed");

  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id as string | undefined;
  return { captureId: captureId ?? null, status: data.status as string };
}
