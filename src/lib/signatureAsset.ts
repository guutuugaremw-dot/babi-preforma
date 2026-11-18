export const STUDIO_SIGNATURE_PATH = '/assets/aistudio/signature_clean.png';

export interface ProcessedSignature {
  dataUrl: string;
  aspectRatio: number;
}

let cachedPromise: Promise<ProcessedSignature | null> | null = null;

/**
 * Loads the pre-cropped, transparent studio signature asset and
 * provides its dataUrl and natural aspect ratio for UI display and PDF export.
 */
export function loadCleanSignatureDataUrl(): Promise<ProcessedSignature | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Signature load failed'));
        img.src = STUDIO_SIGNATURE_PATH;
      });

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return null;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0);

      return {
        dataUrl: canvas.toDataURL('image/png'),
        aspectRatio: w / h,
      };
    } catch {
      return null;
    }
  })();

  return cachedPromise;
}
