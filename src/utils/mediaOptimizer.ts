/**
 * High-performance client-side image compression and media optimization utility.
 * Downscales multi-megabyte phone photos and documents in milliseconds using HTML5 Canvas.
 * Reduces 5MB-15MB phone camera captures down to ~150KB-300KB while preserving receipt text clarity.
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage saved (e.g., 95%)
  durationMs: number;
}

export interface CompressionOptions {
  maxDimension?: number; // Maximum width or height in pixels (default: 1600)
  quality?: number; // Compression quality 0.1 - 1.0 (default: 0.8)
  mimeType?: string; // Target mime type (default: 'image/jpeg')
}

/**
 * Format bytes into human-readable string (e.g. "245 KB", "3.8 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Checks if a file or MIME string is an image
 */
export function isImageFile(fileOrType: File | string): boolean {
  if (typeof fileOrType === 'string') {
    return fileOrType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(fileOrType);
  }
  return fileOrType.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(fileOrType.name);
}

/**
 * Checks if a file is a PDF
 */
export function isPdfFile(fileOrType: File | string): boolean {
  if (typeof fileOrType === 'string') {
    return fileOrType === 'application/pdf' || /\.pdf$/i.test(fileOrType);
  }
  return fileOrType.type === 'application/pdf' || /\.pdf$/i.test(fileOrType.name);
}

/**
 * Compresses an image file client-side using off-screen canvas.
 * Highly optimized for cross-border mobile connectivity and fast Firestore/Storage sync.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const startTime = performance.now();
  const maxDimension = options.maxDimension || 1600;
  const quality = options.quality || 0.8;
  const mimeType = options.mimeType || 'image/jpeg';
  const originalSize = file.size;

  // If not an image, return original file as dataUrl
  if (!isImageFile(file)) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      durationMs: Math.round(performance.now() - startTime)
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate proportional bounding dimensions
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Draw onto offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        // Fallback to original
        readFileAsDataUrl(file).then((dataUrl) => {
          resolve({
            file,
            dataUrl,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 0,
            durationMs: Math.round(performance.now() - startTime)
          });
        });
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill white background (useful for transparent PNGs converted to JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Render image
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed data URL
      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Convert to compressed File
      canvas.toBlob(
        (blob) => {
          const durationMs = Math.round(performance.now() - startTime);

          if (!blob || (blob.size >= originalSize && originalSize < 300 * 1024)) {
            // If original was already tiny (<300KB) and canvas didn't save size, keep original
            readFileAsDataUrl(file).then((origUrl) => {
              resolve({
                file,
                dataUrl: origUrl,
                originalSize,
                compressedSize: originalSize,
                compressionRatio: 0,
                durationMs
              });
            });
            return;
          }

          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const compressedFile = new File([blob], `${baseName}_optimized.jpg`, {
            type: mimeType,
            lastModified: Date.now()
          });

          const compressedSize = blob.size;
          const compressionRatio = Math.round(((originalSize - compressedSize) / originalSize) * 100);

          resolve({
            file: compressedFile,
            dataUrl,
            originalSize,
            compressedSize,
            compressionRatio: Math.max(0, compressionRatio),
            durationMs
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      readFileAsDataUrl(file).then((dataUrl) => {
        resolve({
          file,
          dataUrl,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0,
          durationMs: Math.round(performance.now() - startTime)
        });
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Fast FileReader helper
 */
export function readFileAsDataUrl(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
