import { createDecartClient, models } from '@decartai/sdk';
import { composeOutfit } from './src/outfit.js';

export async function productReference(items, signal) {
  const references = [];
  for (const item of items.filter(item => item.source === 'shop')) {
    if (!/^\/api\/clothing\/image\/[A-Za-z0-9_-]+$/.test(item.reference_image || '')) {
      throw new Error(`No product photo for ${item.name}. Choose another item.`);
    }
    const response = await fetch(item.reference_image, {signal});
    if (!response.ok) throw new Error(`Could not prepare a clothing-only photo for ${item.name}. Choose another product.`);
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
  const layerNames = items.filter(item => ['Tops', 'Layers'].includes(item.category)).map(item => item.name);
  const layering = layerNames.length > 1 ? ` Layer tops from innermost to outermost in this order: ${layerNames.join(', ')}.` : '';
  const prompt = `Style the person in this complete selection together: ${descriptions}. ` +
    (image ? 'The labeled reference board shows the selected store products. Match their garment colors, patterns, logos and shapes. Do not render the board, labels, or people from reference photos. ' : '') +
    layering + `Change only the selected clothing and accessories. Preserve the camera person’s exact face, facial features, skin tone, hair, expression and identity in every frame. Never generate a replacement face or copy any reference person. Keep body shape, pose, and surroundings unchanged. Natural fabric, realistic lighting.` +
    (occasion ? ` Occasion context: ${occasion}. Keep the selected garments unchanged by this context.` : '') +
    (unchanged.length ? ` Keep their existing ${unchanged.join(', ')} unchanged.` : '');
  return client.realtime.connect(stream, {
    model: models.realtime('lucy-2.5'), onRemoteStream, onConnectionChange,
    initialState: {...(image ? {image} : {}), prompt: {text: prompt, enhance: false}},
  });
}
