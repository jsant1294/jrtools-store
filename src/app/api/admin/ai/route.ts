import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { clearAiKey, getAiAdminView, saveAiConfig } from "@/lib/aiSettings";
import { z } from "zod";

// Accessible to both master and store owner — same reasoning as Payments:
// the owner can bring their own Anthropic credits instead of riding the
// platform's shared "sandbox" key.
const AiInput = z.object({
  enabled: z.boolean(),
  apiKey: z.string().trim().optional(),
});

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getAiAdminView());
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = AiInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await saveAiConfig(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await clearAiKey();
  return NextResponse.json({ ok: true });
}
