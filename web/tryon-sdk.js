import { createDecartClient, models } from '@decartai/sdk';
import { composeOutfit } from './src/outfit.js';

export async function productReference(items, signal) {
  const references = [];
  for (const item of items.filter(item => item.source === 'shop')) {
    if (!/^\/api\/clothing\/image\/[A-Za-z0-9_-]+$/.test(item.reference_image || '')) {
      throw new Error(`No product photo for ${item.name}. Choose another item.`);
    }
    const response = await fetch(item.reference_image, {signal});
    if (!response.ok) throw new Error(`Could not load the photo for ${item.name}. Search again or choose another item.`);
    references.push({file: await response.blob(), category: item.category === 'Bottoms' ? 'jeans' : item.category === 'Accessories' ? 'accessories' : 'shirt'});
  }
  return composeOutfit(references);
}

export async function connectTryOn({apiKey, stream, items, signal, occasion = '', onRemoteStream, onConnectionChange}) {
  const image = await productReference(items, signal);
  signal?.throwIfAborted();
  const client = createDecartClient({apiKey});
  const descriptions = items.map(item => item.source === 'shop'
    ? `${item.category}: ${item.brand || ''} ${item.name} (match its product reference photo)`
    : `${item.color} (${item.hex}) ${item.name}`).join('; ');
  const unchanged = [];
  if (!items.some(item => ['Tops', 'Layers'].includes(item.category))) unchanged.push('upper-body clothing');
  if (!items.some(item => item.category === 'Bottoms')) unchanged.push('pants');
  if (!items.some(item => item.category === 'Accessories')) unchanged.push('accessories');
  const prompt = `Style the person in this complete selection together: ${descriptions}. ` +
    (image ? 'The labeled reference board shows the selected store products. Match their garment colors, patterns, logos and shapes. Do not render the board, labels, or people from reference photos. ' : '') +
    `Change only the selected clothing and accessories. Keep their face, hair, body shape, pose, and surroundings unchanged. Natural fabric, realistic lighting.` +
    (occasion ? ` Occasion context: ${occasion}. Keep the selected garments unchanged by this context.` : '') +
    (unchanged.length ? ` Keep their existing ${unchanged.join(', ')} unchanged.` : '');
  return client.realtime.connect(stream, {
    model: models.realtime('lucy-2.5'), onRemoteStream, onConnectionChange,
    initialState: {...(image ? {image} : {}), prompt: {text: prompt, enhance: true}},
  });
}
