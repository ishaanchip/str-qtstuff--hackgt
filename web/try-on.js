const $ = id => document.getElementById(id);
let result, session, camera, timer, controller, generation = 0, busy = false;
const outfit = {shirt: null, pants: null, accessory: null};
const slots = {shirt: 'Shirt / layer', pants: 'Pants', accessory: 'Accessory'};
const slotFor = item => item.category === 'Bottoms' ? 'pants' : item.category === 'Accessories' ? 'accessory' : 'shirt';
const chosenItems = () => Object.values(outfit).filter(Boolean);
try { result = JSON.parse(sessionStorage.getItem('fitting-room-scan')); } catch {}
const valid = result?.clothing?.length && result.clothing.every(item => typeof item.name === 'string' && /^#[0-9a-f]{6}$/i.test(item.hex) && Number.isFinite(item.score));
const error = (message = '') => { $('error').textContent = message; $('error').hidden = !message; };
function element(tag, className, text) { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; }
function garment(item) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 100 110'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  const accessories = {
    'Woven scarf': 'M22 15H78V35H60L72 98H51L42 45L35 90H16L29 35H22Z',
    'Baseball cap': 'M22 65V48A28 28 0 0 1 78 48V65H22L7 80H90L78 65Z',
    'Leather belt': 'M8 44H92V67H8ZM40 40V71H65V40ZM46 47H59V64H46Z',
    'Crossbody bag': 'M28 48V32A22 22 0 0 1 72 32V48H65V32A15 15 0 0 0 35 32V48ZM16 45H84L90 100H10Z',
  };
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('d', item.category === 'Accessories' ? (accessories[item.name] || accessories['Woven scarf']) : item.category === 'Bottoms' ? 'M24 8H76L83 103H57L50 48L43 103H17Z' : 'M32 10Q50 28 68 10L95 29L82 50L70 43V100H30V43L18 50L5 29Z');
  path.setAttribute('fill', item.hex); path.setAttribute('stroke', '#0003'); svg.append(path); return svg;
}
function stop(message = 'Preview is off. Click Try to start a new session.') {
  generation++; controller?.abort(); controller = null; clearTimeout(timer);
  session?.disconnect(); session = null;
  camera?.getTracks().forEach(track => track.stop()); camera = null;
  $('input').srcObject = null; $('output').srcObject = null; $('input').hidden = true; $('output').hidden = true;
  $('video-empty').hidden = false; $('session-badge').textContent = 'PREVIEW OFF';
  busy = false; $('try').disabled = chosenItems().length === 0; $('stop').disabled = true; $('status').textContent = message;
}
function select(item) {
  const slot = slotFor(item);
  if (outfit[slot]?.id === item.id) return;
  outfit[slot] = item;
  stop('Outfit updated. Click Try to preview your choices together.');
  error(); renderOutfit(); renderClothing();
}
function renderOutfit() {
  $('outfit').replaceChildren();
  for (const [slot, label] of Object.entries(slots)) {
    const item = outfit[slot];
    const row = element('div', 'outfit-slot'); row.dataset.slot = slot;
    const info = element('div', 'outfit-info');
    info.append(element('strong', '', label), element('span', '', item ? `${item.color} ${item.name}` : 'Keep what I’m wearing'));
    if (item) {
      const art = element('div', 'outfit-art'); art.append(garment(item)); row.append(art);
      info.append(element('span', 'score', `${item.score.toFixed(1)} / 100 color match`));
    }
    row.append(info);
    if (item) {
      const remove = element('button', 'remove-item', 'Remove');
      remove.setAttribute('aria-label', `Remove ${label}`);
      remove.addEventListener('click', () => {
        outfit[slot] = null; stop('Outfit updated. Click Try to preview your choices.');
        error(); renderOutfit(); renderClothing();
      });
      row.append(remove);
    }
    $('outfit').append(row);
  }
}
function renderClothing() {
  $('clothing').replaceChildren();
  for (const item of result.clothing.filter(item => $('category').value === 'All clothing' || item.category === $('category').value)) {
    const card = element('article', `garment-card${outfit[slotFor(item)]?.id === item.id ? ' selected' : ''}`);
    const art = element('div', 'garment-art'); art.append(garment(item));
    const info = element('div', 'garment-info');
    const button = element('button', '', outfit[slotFor(item)]?.id === item.id ? 'Selected' : 'Add to outfit');
    button.setAttribute('aria-label', `Select ${item.color} ${item.name}`); button.setAttribute('aria-pressed', String(outfit[slotFor(item)]?.id === item.id)); button.addEventListener('click', () => select(item));
    info.append(element('span', 'category', item.category === 'Tops' ? 'Shirts' : item.category === 'Bottoms' ? 'Pants' : item.category), element('h3', '', item.name), element('p', '', item.color), element('span', 'score', `${item.score.toFixed(1)} / 100 color match`), button);
    card.append(art, info); $('clothing').append(card);
  }
  if (!$('clothing').childElementCount) {
    $('clothing').append(element('p', 'muted', 'No recommendations in this category. Start a new face scan to refresh your clothing options.'));
  }
}
$('try').addEventListener('click', async () => {
  if (!chosenItems().length || busy) return;
  stop(); error(); busy = true; $('try').disabled = true; $('stop').disabled = false;
  const attempt = generation; const items = chosenItems();
  controller = new AbortController(); const signal = controller.signal;
  $('status').textContent = 'Opening your camera…'; $('session-badge').textContent = 'STARTING';
  timer = setTimeout(() => { if (attempt === generation) { stop('Connection timed out. Click Try to retry.'); error('Could not connect to the try-on service in time.'); } }, 60000);
  try {
    // No SDK load, credential request, camera or provider call occurs before this click.
    const stream = await navigator.mediaDevices.getUserMedia({video: {width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user'}, audio: false});
    if (attempt !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
    camera = stream; $('input').srcObject = stream; $('input').hidden = false; await $('input').play();
    const {connectTryOn} = await import('/tryon-assets/sdk.js');
    if (attempt !== generation) return;
    $('status').textContent = 'Starting your try-on session…';
    const response = await fetch('/api/try-on/token', {method: 'POST', headers: {'X-Try-On-Intent': 'try'}, signal});
    const token = await response.json(); if (!response.ok) throw new Error(token.error || 'Unable to start try-on.');
    if (attempt !== generation) return;
    const connected = await connectTryOn({apiKey: token.apiKey, stream, items,
      onRemoteStream: remote => {
        if (attempt !== generation) return;
        $('output').srcObject = remote; $('output').hidden = false; $('video-empty').hidden = true;
        $('output').play().catch(() => {});
      },
      onConnectionChange: state => {
        if (attempt !== generation) return;
        if (['disconnected', 'failed'].includes(state)) stop('Session ended. Click Try to start again.');
      },
    });
    if (attempt !== generation) { connected.disconnect(); return; }
    session = connected; clearTimeout(timer);
    session.on?.('error', () => { if (attempt === generation) { stop(); error('The try-on connection failed. Click Try to reconnect.'); } });
    session.on?.('sessionEnded', () => { if (attempt === generation) stop('Session ended. Click Try to start again.'); });
    timer = setTimeout(() => stop('Five-minute session finished. Click Try for another session.'), 300000);
    $('session-badge').textContent = 'LIVE TRY-ON'; $('status').textContent = `Trying ${items.map(item => `${item.color} ${item.name}`).join(', ')}. Change your outfit to stop, then click Try again.`;
  } catch (e) {
    if (attempt !== generation) return;
    stop('Preview is off. Click Try when you’re ready.');
    error(e.name === 'NotAllowedError' ? 'Allow camera access to try on this look. No try-on session was started.' : (e.message || 'Could not start try-on.'));
  }
});
$('stop').addEventListener('click', () => stop());
$('category').addEventListener('change', renderClothing);
window.addEventListener('pagehide', () => stop());
if (!valid) $('no-scan').hidden = false;
else {
  $('fitting-room').hidden = false;
  $('summary').textContent = 'Your personal palette · generated from your skin, hair, and eye colors.';
  for (const color of (result.recommended_colors || []).slice(0, 12)) {
    const card = element('div', 'swatch'); const fill = element('div', 'swatch-color'); fill.style.background = color.hex;
    const text = element('div', 'swatch-text'); text.append(element('strong', '', color.name), element('span', '', `${Number(color.score).toFixed(1)} / 100`));
    if (color.explanation) card.title = color.explanation;
    card.append(fill, text); $('palette').append(card);
  }
  select(result.clothing[0]);
}
