/**
 * Image utilities — compression, resizing, and camera helpers.
 * Keeps meal images small enough for IndexedDB storage and fast AI analysis.
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

/** Compress an image file/blob to a base64 JPEG data-URL. */
export async function compressImage(file: File | Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  return blobToDataUrl(blob);
}

/** Calculate dimensions that fit within `max` while preserving aspect ratio. */
function fitDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/** Convert a Blob to a base64 data-URL string. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Extract raw base64 content from a data-URL (strips the prefix). */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}
