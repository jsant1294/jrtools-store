import { NextResponse } from "next/server";
import { getAdminRole } from "@/lib/adminAuth";

export async function GET() {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ role });
}
