import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdmin } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const requestedFolder = form.get("folder");
  const folder = requestedFolder === "hero" || requestedFolder === "features"
    ? requestedFolder
    : "products";
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "images only" }, { status: 415 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "max 8MB" }, { status: 413 });

  const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, { access: "public" });
  return NextResponse.json({ url: blob.url, id: blob.pathname });
}
