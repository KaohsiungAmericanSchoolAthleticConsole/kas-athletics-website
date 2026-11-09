// Shrinks photos in the browser before upload: phones produce 5–15 MB images,
// the website never needs more than ~2400px wide.

const MAX_SIDE = 2400;
const QUALITY = 0.85;

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** @param {File} file @returns {Promise<string>} data URL ready to upload */
export async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG, PNG, WebP or GIF).');
  if (file.type === 'image/gif') return readAsDataUrl(file); // keep animation

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This photo format is not supported by your browser. Try a JPG or PNG.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = (await canvasToBlob(canvas, 'image/webp')) || (await canvasToBlob(canvas, 'image/jpeg'));
  // Use whichever is smaller: the original or the resized copy.
  return readAsDataUrl(blob && blob.size < file.size ? blob : file);
}
