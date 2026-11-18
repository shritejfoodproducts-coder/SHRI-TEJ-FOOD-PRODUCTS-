/**
 * Compresses a camera or gallery shop photo on client canvas into a compact JPEG/WebP data URL
 * so wholesale dealer shop photos save cleanly inside Firestore document limits (<= 150KB).
 */
export async function compressShopPhoto(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> {
  const maxWidth = options.maxWidth ?? 720;
  const maxHeight = options.maxHeight ?? 540;
  const startQuality = options.quality ?? 0.72;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('फ़ोटो पढ़ने में त्रुटि हुई।'));
    };
    reader.onerror = () => reject(new Error('फ़ोटो लोड नहीं हो सकी।'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('यह इमेज फ़ाइल सपोर्ट नहीं है।'));
    image.src = dataUrl;
  });

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('कैनवास इनिशियलाइज़ नहीं हो सका।');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let q = startQuality;
  let compressed = canvas.toDataURL('image/jpeg', q);
  while (compressed.length > 180_000 && q > 0.35) {
    q = Math.round((q - 0.1) * 100) / 100;
    compressed = canvas.toDataURL('image/jpeg', q);
  }
  return compressed;
}
