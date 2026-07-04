"use client";
// ============================================================
// The heart of the non-techie admin: two giant targets.
// 1) Drop zone / tap-to-browse for files
// 2) "Take Photo" — opens the phone camera directly (capture="environment")
// Uploads go straight to Vercel Blob via /api/admin/upload.
// Max 4 images per product (the modal rotator). Drag to reorder.
// ============================================================
import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, X, GripVertical, Loader2 } from "lucide-react";
import { resizeImageForUpload } from "@/lib/clientImages";

type Img = { id?: string; url: string; uploading?: boolean };

export function ProductImageUploader({
  images, onChange, labels,
}: {
  images: Img[];
  onChange: (imgs: Img[]) => void;
  labels: { drop: string; takePhoto: string; maxReached: string; uploading: string };
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = images.length >= 4;

  const upload = useCallback(async (files: FileList | File[]) => {
    const room = 4 - images.length;
    const batch = Array.from(files).slice(0, room);
    if (!batch.length) return;

    setError(null);
    const previews: Img[] = batch.map((f) => ({ url: URL.createObjectURL(f), uploading: true }));
    onChange([...images, ...previews]);

    const uploaded: Img[] = [];
    try {
      for (const file of batch) {
        const uploadFile = await resizeImageForUpload(file);
        const form = new FormData();
        form.append("file", uploadFile);
        const res = await fetch("/api/admin/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "upload failed");
        uploaded.push({ id: data.id, url: data.url });
      }
      onChange([...images, ...uploaded]);
    } catch {
      setError("Upload failed. Try a smaller image. / No se pudo subir.");
      onChange(images);
    }
  }, [images, onChange]);

  return (
    <div className="space-y-3">
      {/* Thumbnails — position 0 is the catalog card image */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img.url} className="plate relative aspect-square overflow-hidden group">
              {img.uploading ? (
                <div className="absolute inset-0 grid place-items-center bg-forge-800/80">
                  <Loader2 className="h-6 w-6 animate-spin text-torch-500" />
                </div>
              ) : (
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              )}
              <span className="stamped absolute left-1 top-1 bg-forge-900/80 px-1 rounded">
                {i === 0 ? "MAIN" : `0${i + 1}`}
              </span>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded bg-forge-900/80 p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove image"
              >
                <X className="h-4 w-4 text-torch-400" />
              </button>
              <GripVertical className="absolute bottom-1 right-1 h-4 w-4 text-steel-400" />
            </div>
          ))}
        </div>
      )}

      {/* Two big targets — built for thumbs, not mice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={full}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
          className={`plate flex min-h-32 flex-col items-center justify-center gap-2 p-6 transition
            ${dragOver ? "border-torch-500 bg-forge-700" : ""}
            ${full ? "opacity-40" : "hover:border-steel-400 cursor-pointer"}`}
        >
          <ImagePlus className="h-8 w-8 text-steel-300" />
          <span className="font-display text-lg uppercase tracking-wide text-steel-100">
            {full ? labels.maxReached : labels.drop}
          </span>
        </button>

        <button
          type="button"
          disabled={full}
          onClick={() => cameraRef.current?.click()}
          className={`plate flex min-h-32 flex-col items-center justify-center gap-2 p-6 transition
            ${full ? "opacity-40" : "hover:border-torch-500 cursor-pointer"}`}
        >
          <Camera className="h-8 w-8 text-torch-500" />
          <span className="font-display text-lg uppercase tracking-wide text-steel-100">
            {labels.takePhoto}
          </span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => e.target.files && upload(e.target.files)} />
      {/* capture="environment" = rear camera opens directly on mobile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => e.target.files && upload(e.target.files)} />
      {error && <p className="text-sm text-torch-400">{error}</p>}
    </div>
  );
}
