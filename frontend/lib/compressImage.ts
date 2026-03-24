/**
 * Сжатие изображения перед отправкой в чат.
 * Использует Canvas API для ресайза и сжатия качества.
 * Максимум: 1200px по большей стороне, качество 0.7 (WebP/JPEG).
 */
export async function compressImage(
  file: File,
  maxSize = 1200,
  quality = 0.7,
): Promise<File> {
  // Если файл маленький (< 200KB), не сжимаем
  if (file.size < 200 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Ресайз пропорционально
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Формат: предпочитаем webp, фоллбэк на jpeg
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = outputType === 'image/png' ? '.png' : '.webp';
          const name = file.name.replace(/\.[^.]+$/, ext);
          resolve(new File([blob], name, { type: outputType, lastModified: Date.now() }));
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
