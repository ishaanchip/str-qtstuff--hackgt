export const CATEGORIES = {
  shirt: { label: 'Shirt', limit: 1 },
  jeans: { label: 'Jeans', limit: 1 },
  accessories: { label: 'Accessories', limit: 4 },
};

export function referenceLabel(item, index, items) {
  if (item.category !== 'accessories') return CATEGORIES[item.category].label;
  return `Accessory ${items.slice(0, index + 1).filter((entry) => entry.category === 'accessories').length}`;
}

export function outfitPrompt(items, instructions = '') {
  const labels = items.map((item, i) => referenceLabel(item, i, items));
  return `Dress the person in all ${items.length} items from the labeled reference board simultaneously: ${labels.join(', ')}. ` +
    'Each labeled panel is a separate product reference, not a separate outfit. ' +
    (items.some((item) => item.category === 'shirt') ? 'Replace the shirt with the Shirt reference. ' : '') +
    (items.some((item) => item.category === 'jeans') ? 'Replace the trousers with the Jeans reference. ' : '') +
    (items.some((item) => item.category === 'accessories') ? 'Wear every accessory in its appropriate location on the body. ' : '') +
    'Apply all selected items together. Match their colors, patterns, logos, and shapes. Preserve the face, body, pose, background, and clothing categories without a reference. ' +
    'The panel labels and board background are reference guides only; render the wearable items. ' + instructions.trim();
}

// Lucy accepts one reference image. A labeled contact sheet carries the whole
// outfit in that single image; every update replaces the complete outfit state.
export async function composeOutfit(items) {
  if (!items.length) return null;
  const columns = Math.min(items.length, 2);
  const canvas = document.createElement('canvas');
  canvas.width = columns * 512;
  canvas.height = Math.ceil(items.length / columns) * 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < items.length; i++) {
    const bitmap = await createImageBitmap(items[i].file);
    try {
      const x = (i % columns) * 512;
      const y = Math.floor(i / columns) * 512;
      ctx.fillStyle = '#e9ede2';
      ctx.fillRect(x, y, 512, 52);
      ctx.fillStyle = '#20352c';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(referenceLabel(items[i], i, items), x + 20, y + 34);
      const scale = Math.min(472 / bitmap.width, 420 / bitmap.height);
      const width = bitmap.width * scale, height = bitmap.height * scale;
      ctx.drawImage(bitmap, x + (512 - width) / 2, y + 62 + (430 - height) / 2, width, height);
    } finally { bitmap.close(); }
  }
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare the outfit reference.')), 'image/png',
  ));
}
