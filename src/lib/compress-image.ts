"use client";

/** Downscales photos to at most `max` px on the long edge as JPEG, so uploads stay small. Non-images pass through. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Replaces image files in a FormData field with compressed copies. */
export async function compressFormImages(fd: FormData, field: string) {
  const files = fd.getAll(field);
  if (!files.some((f) => f instanceof File && f.type.startsWith("image/"))) return fd;
  fd.delete(field);
  for (const f of files) fd.append(field, f instanceof File ? await compressImage(f) : f);
  return fd;
}
