/**
 * Image utilities — compression, resizing, and camera helpers.
 * Keeps meal images small enough for IndexedDB storage and fast AI analysis.
 *
 * Uses a regular <canvas> (not OffscreenCanvas) for maximum mobile compatibility.
 */

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.6;

/** Compress an image file/blob to a base64 JPEG data-URL. */
export async function compressImage(file: File | Blob): Promise<string> {
  // Load image into an HTMLImageElement (works on all browsers)
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    // Validate we actually got image data
    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("Canvas produced empty image");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Load an image from a URL and wait for it to be ready. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Calculate dimensions that fit within `max` while preserving aspect ratio. */
function fitDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/** Extract raw base64 content from a data-URL (strips the prefix). */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}

/** Extract MIME type from a data-URL (e.g. "image/jpeg"). */
export function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match?.[1] ?? "image/jpeg";
}
