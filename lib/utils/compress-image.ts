/**
 * Client-side image compression and conversion to JPEG.
 *
 * Loads an image file (including iOS HEIC, PNG, WEBP, etc), scales it down so
 * its largest side is at most `maxDim`, and re-encodes it as JPEG. This lets us
 * accept any image the device offers while keeping Supabase storage small and
 * satisfying buckets that only allow jpg/png/webp.
 *
 * If anything fails (decode error, no canvas support, null blob) it falls back
 * to returning the original file so the upload still works.
 */
export async function compressImage(
  file: File,
  opts?: { maxDim?: number; quality?: number },
): Promise<Blob> {
  const maxDim = opts?.maxDim ?? 1600;
  const quality = opts?.quality ?? 0.82;

  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
        img.src = url;
      });

      const { width, height } = img;
      if (!width || !height) return file;

      const scale = Math.min(1, maxDim / Math.max(width, height));
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
      return blob ?? file;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return file;
  }
}
