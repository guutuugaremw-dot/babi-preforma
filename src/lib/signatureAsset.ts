export const STUDIO_SIGNATURE_PATH = '/assets/aistudio/image_be25575d.png';

export interface ProcessedSignature {
  dataUrl: string;
  aspectRatio: number;
}

let cachedPromise: Promise<ProcessedSignature | null> | null = null;

/**
 * Loads the uploaded studio signature photo, isolates the centered blue-ink
 * strokes (excluding paper background, fold shadows, and edge artifacts),
 * crops tightly to the signature bounds, and returns a transparent PNG.
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

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) return null;

      srcCtx.drawImage(img, 0, 0);

      // Scan central region where the handwritten signature sits (avoids edge pen/finger)
      const scanLeft = Math.floor(w * 0.25);
      const scanRight = Math.floor(w * 0.8);
      const scanTop = Math.floor(h * 0.28);
      const scanBottom = Math.floor(h * 0.64);
      const scanW = Math.max(1, scanRight - scanLeft);
      const scanH = Math.max(1, scanBottom - scanTop);

      const imageData = srcCtx.getImageData(scanLeft, scanTop, scanW, scanH);
      const data = imageData.data;

      let minX = scanW;
      let minY = scanH;
      let maxX = -1;
      let maxY = -1;

      for (let py = 0; py < scanH; py += 1) {
        for (let px = 0; px < scanW; px += 1) {
          const idx = (py * scanW + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const blueExcess = b - r;

          // Blue ballpoint ink stands out strongly in blueExcess and lower luminance
          const isInk =
            (blueExcess > 15 && lum < 210) ||
            (blueExcess > 9 && lum < 165) ||
            lum < 110;

          if (isInk) {
            const alpha = Math.min(
              255,
              Math.max(
                0,
                Math.round((blueExcess - 10) * 8 + Math.max(0, 175 - lum) * 1.4)
              )
            );
            if (alpha > 18) {
              // Deepen ink color slightly so it reads cleanly on white paper & PDF
              data[idx] = Math.max(12, Math.round(r * 0.55));
              data[idx + 1] = Math.max(28, Math.round(g * 0.65));
              data[idx + 2] = Math.min(205, Math.round(b * 0.95));
              data[idx + 3] = alpha;

              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            } else {
              data[idx + 3] = 0;
            }
          } else {
            data[idx + 3] = 0;
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        return null;
      }

      const pad = Math.max(8, Math.round(Math.min(scanW, scanH) * 0.04));
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(scanW - cropX, maxX - minX + 1 + pad * 2);
      const cropH = Math.min(scanH - cropY, maxY - minY + 1 + pad * 2);

      srcCtx.putImageData(imageData, scanLeft, scanTop);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return null;

      outCtx.drawImage(
        srcCanvas,
        scanLeft + cropX,
        scanTop + cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );

      return {
        dataUrl: outCanvas.toDataURL('image/png'),
        aspectRatio: cropW / cropH,
      };
    } catch {
      return null;
    }
  })();

  return cachedPromise;
}
