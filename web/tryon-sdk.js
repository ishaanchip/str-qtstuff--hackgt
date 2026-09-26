import { createDecartClient, models } from '@decartai/sdk';
export function connectTryOn({apiKey, stream, items, onRemoteStream, onConnectionChange}) {
  const client = createDecartClient({apiKey});
  const descriptions = items.map(item => `${item.color} (${item.hex}) ${item.name}`).join('; ');
  const unchanged = [];
  if (!items.some(item => ['Tops', 'Layers'].includes(item.category))) unchanged.push('upper-body clothing');
  if (!items.some(item => item.category === 'Bottoms')) unchanged.push('pants');
  if (!items.some(item => item.category === 'Accessories')) unchanged.push('accessories');
  const prompt = `Style the person in this complete selection together: ${descriptions}. Change only the selected clothing and accessories. Keep their face, hair, body shape, pose, and surroundings unchanged. Natural fabric, realistic lighting.${unchanged.length ? ` Keep their existing ${unchanged.join(', ')} unchanged.` : ''}`;
  return client.realtime.connect(stream, {
    model: models.realtime('lucy-2.5'), onRemoteStream, onConnectionChange,
    initialState: {prompt: {text: prompt, enhance: true}},
  });
}
