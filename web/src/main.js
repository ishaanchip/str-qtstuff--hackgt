import { createDecartClient, models } from '@decartai/sdk';
import { TryOnSession } from './session.js';
import { CATEGORIES, composeOutfit, outfitPrompt } from './outfit.js';
import './style.css';

const $ = (id) => document.getElementById(id);
let configured = false;
const selections = { shirt: [], jeans: [], accessories: [] };
const validating = new Set();
const uploadSequence = { shirt: 0, jeans: 0, accessories: 0 };
let reference = null;
let referenceUrl;
let referenceSequence = 0;
let composing = false;
let applying = false;
const selectedItems = () => Object.values(selections).flat();
const statusLabels = {
  idle: 'Ready when you are', camera: 'Waiting for camera…', connecting: 'Connecting to Lucy…',
  live: 'Live · Lucy 2.5', reconnecting: 'Reconnecting…', stopping: 'Stopping…',
};
function showError(error) {
  $('error').textContent = error.message;
  $('error').hidden = false;
}
function clearError() { $('error').hidden = true; }
function refresh() {
  const ready = configured && reference && !validating.size && !composing;
  $('start').disabled = !ready || session.state !== 'idle' || applying;
  $('apply').disabled = !ready || session.state !== 'live' || applying;
  $('stop').disabled = ['idle', 'stopping'].includes(session.state);
  $('status').textContent = statusLabels[session.state];
  $('apply').textContent = applying ? 'Applying…' : 'Apply outfit';
}
function attachVideo(id, stream) {
  const video = $(id);
  video.srcObject = stream;
  if (stream) video.play().catch((error) => {
    // Clearing a stream during Stop rejects an outstanding play() with
    // AbortError. It must not overwrite the actual connection error.
    if (video.srcObject === stream && error.name !== 'AbortError') {
      showError(new Error('Video playback was blocked. Allow autoplay in your browser and restart.'));
    }
  });
  if (id === 'video-output') $('output-empty').hidden = Boolean(stream);
}
const session = new TryOnSession({
  model: models.realtime('lucy-2.5'),
  createClient: createDecartClient,
  getUserMedia: (constraints) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires localhost or HTTPS.');
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  fetchToken: async (signal) => {
    const response = await fetch('/api/realtime-token', {
      method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error('Token request failed');
      error.userMessage = body.error || 'Could not start the Decart session.';
      throw error;
    }
    if (!body.apiKey) throw new Error('Missing session token.');
    return body;
  },
  onLocal: (stream) => attachVideo('video-input', stream),
  onRemote: (stream) => attachVideo('video-output', stream),
  onState: refresh,
  onError: showError,
});

function renderSlots() {
  for (const [category, config] of Object.entries(CATEGORIES)) {
    const gallery = $(`${category}-items`);
    gallery.replaceChildren();
    for (const [index, item] of selections[category].entries()) {
      const card = document.createElement('div');
      card.className = 'outfit-item';
      const image = document.createElement('img');
      image.src = item.url;
      image.alt = `${config.label}: ${item.file.name}`;
      if (category === 'shirt' && index === 0) image.id = 'shirt-preview';
      const name = document.createElement('span');
      name.textContent = item.file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${item.file.name}`);
      remove.addEventListener('click', () => {
        ++uploadSequence[category];
        validating.delete(category);
        selections[category] = selections[category].filter((entry) => entry !== item);
        URL.revokeObjectURL(item.url);
        $(`${category}-upload`).value = '';
        renderSlots();
        rebuildReference();
      });
      card.append(image, name, remove);
      gallery.append(card);
    }
  }
}

async function rebuildReference() {
  const sequence = ++referenceSequence;
  const items = selectedItems();
  reference = null;
  composing = true;
  $('filename').textContent = items.length ? 'Preparing outfit…' : 'No items selected.';
  $('reference-details').hidden = true;
  refresh();
  try {
    const blob = await composeOutfit(items);
    if (sequence !== referenceSequence) return;
    reference = blob;
    if (referenceUrl) URL.revokeObjectURL(referenceUrl);
    referenceUrl = blob ? URL.createObjectURL(blob) : null;
    if (referenceUrl) $('outfit-reference').src = referenceUrl;
    else $('outfit-reference').removeAttribute('src');
    $('reference-details').hidden = !blob;
    $('filename').textContent = items.length
      ? `${items.length} item${items.length === 1 ? '' : 's'} selected · ${session.state === 'live' ? 'Click Apply outfit to update.' : 'Ready to try on together.'}`
      : 'No items selected.';
  } catch { if (sequence === referenceSequence) showError(new Error('Could not prepare the outfit. Remove or replace an image and try again.')); }
  finally { if (sequence === referenceSequence) { composing = false; refresh(); } }
}

for (const [category, config] of Object.entries(CATEGORIES)) {
  const section = document.createElement('section');
  section.className = 'outfit-slot';
  section.innerHTML = `<label for="${category}-upload">${config.label}<small>${config.limit === 1 ? '1 image' : 'Up to 4 images'}</small></label>
    <div id="${category}-items" class="outfit-items"></div>
    <input id="${category}-upload" type="file" accept="image/png,image/jpeg,image/webp" ${config.limit > 1 ? 'multiple' : ''} />`;
  $('outfit-slots').append(section);
  $(`${category}-upload`).addEventListener('change', async (event) => {
    const files = [...event.target.files];
    if (!files.length) return;
    const sequence = ++uploadSequence[category];
    validating.add(category);
    clearError();
    refresh();
    try {
      if (files.length + (config.limit > 1 ? selections[category].length : 0) > config.limit) {
        throw new Error(`Choose up to ${config.limit} ${config.label.toLowerCase()} image${config.limit > 1 ? 's' : ''}. Remove an existing item to add another.`);
      }
      for (const file of files) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose PNG, JPEG, or WebP images.');
        if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Each image must be smaller than 10 MB.');
        const bitmap = await createImageBitmap(file);
        const valid = bitmap.width >= 32 && bitmap.height >= 32 && bitmap.width * bitmap.height <= 40_000_000;
        bitmap.close();
        if (!valid) throw new Error('Use images at least 32 × 32 pixels and no larger than 40 megapixels.');
      }
      if (sequence !== uploadSequence[category]) return;
      if (config.limit === 1) {
        selections[category].forEach((item) => URL.revokeObjectURL(item.url));
        selections[category] = [];
      }
      selections[category].push(...files.map((file) => ({ category, file, url: URL.createObjectURL(file) })));
      renderSlots();
      await rebuildReference();
    } catch (error) {
      if (sequence === uploadSequence[category]) showError(new Error(error.name === 'InvalidStateError' ? 'This file could not be read as an image.' : error.message));
    } finally {
      if (sequence === uploadSequence[category]) {
        validating.delete(category);
        event.target.value = '';
        refresh();
      }
    }
  });
}
$('start').addEventListener('click', () => {
  clearError();
  session.start(reference, outfitPrompt(selectedItems(), $('prompt').value), $('enhance').checked).catch(showError);
});
$('stop').addEventListener('click', () => { session.stop(); clearError(); });
$('apply').addEventListener('click', async () => {
  clearError();
  applying = true;
  const appliedReference = reference;
  refresh();
  try {
    const applied = await session.apply(appliedReference, outfitPrompt(selectedItems(), $('prompt').value), $('enhance').checked);
    if (applied && reference === appliedReference) $('filename').textContent = `${selectedItems().length} items · Outfit applied`;
  } catch {
    if (session.state === 'live') showError(new Error('Could not apply this outfit. Try smaller images or reconnect.'));
  } finally { applying = false; refresh(); }
});
$('prompt').addEventListener('input', refresh);
window.addEventListener('pagehide', () => session.stop());

try {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Server configuration is unavailable. Restart npm run dev.');
  const config = await response.json();
  configured = config.configured;
  $('setup').hidden = configured;
} catch (error) { showError(error); }
refresh();
