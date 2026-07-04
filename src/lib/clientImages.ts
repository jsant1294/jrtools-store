import { upload as uploadBlob } from "@vercel/blob/client";

const MAX_IMAGE_SIDE = 1600;
const TARGET_BYTES = 900 * 1024;
const SERVER_FALLBACK_LIMIT = 3.5 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("image compression failed"));
    }, "image/jpeg", quality);
  });
}

export async function resizeImageForUpload(file: File) {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= TARGET_BYTES && file.type === "image/jpeg") return file;

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.84;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}

function safeFileName(name: string) {
  return (name || "image")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
}

export async function uploadAdminImage(file: File, folder: "hero" | "features" | "products") {
  let uploadFile = file;
  try {
    uploadFile = await resizeImageForUpload(file);
  } catch {
    uploadFile = file;
  }

  const extension = uploadFile.type === "image/png"
    ? "png"
    : uploadFile.type === "image/webp"
      ? "webp"
      : uploadFile.type === "image/heic" || uploadFile.type === "image/heif"
        ? "heic"
        : "jpg";

  const blob = await uploadBlob(
    `${folder}/${Date.now()}-${safeFileName(uploadFile.name)}.${extension}`,
    uploadFile,
    {
      access: "public",
      contentType: uploadFile.type || "image/jpeg",
      handleUploadUrl: "/api/admin/client-upload",
      clientPayload: JSON.stringify({ folder }),
      multipart: uploadFile.size > 4 * 1024 * 1024,
    },
  ).catch(async (directError) => {
    if (uploadFile.size > SERVER_FALLBACK_LIMIT) throw directError;

    const form = new FormData();
    form.append("file", uploadFile);
    form.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "upload failed");
    return { pathname: data.id as string, url: data.url as string };
  });

  return { id: blob.pathname, url: blob.url };
}
