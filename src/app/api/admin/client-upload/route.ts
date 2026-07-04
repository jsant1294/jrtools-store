import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/adminAuth";

const folders = new Set(["hero", "features", "products"]);

function parsePayload(payload: string | null) {
  if (!payload) return { folder: "products" };
  try {
    const parsed = JSON.parse(payload) as { folder?: string };
    return { folder: folders.has(parsed.folder ?? "") ? parsed.folder! : "products" };
  } catch {
    return { folder: "products" };
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await isAdmin())) throw new Error("unauthorized");

        const { folder } = parsePayload(clientPayload);
        if (!pathname.startsWith(`${folder}/`)) throw new Error("invalid upload path");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ folder }),
        };
      },
      onUploadCompleted: async () => {
        // The admin form persists the returned Blob URL with the product/settings save.
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    const status = message === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
