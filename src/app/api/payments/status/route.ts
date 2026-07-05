import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/paymentSettings";

// Public, unauthenticated — the checkout page needs to know which payment
// methods are live. Only booleans, never credentials.
export async function GET() {
  return NextResponse.json(await getPaymentStatus());
}
