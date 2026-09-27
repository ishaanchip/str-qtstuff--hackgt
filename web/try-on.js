const $ = id => document.getElementById(id);
let result, session, camera, timer, controller, generation = 0, busy = false;
const outfit = {shirt: null, pants: null, accessory: null};
const slots = {shirt: 'Shirt / layer', pants: 'Pants', accessory: 'Accessory'};
const slotFor = item => item.category === 'Bottoms' ? 'pants' : item.category === 'Accessories' ? 'accessory' : 'shirt';
const chosenItems = () => Object.values(outfit).filter(Boolean);
let shopItems = [];
let activeOccasion = '';
let selectedColor = null;
try { result = JSON.parse(sessionStorage.getItem('fitting-room-scan')); } catch {}
const valid = Array.isArray(result?.recommended_colors) && result.recommended_colors.length > 0 && result.recommended_colors.every(color => /^#[0-9a-f]{6}$/i.test(color.hex) && Number.isFinite(color.score));
const error = (message = '') => { $('error').textContent = message; $('error').hidden = !message; };
function element(tag, className, text) { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; }
function garment(item) {
  if (item.source === 'shop' && item.image) {
    const image = document.createElement('img'); image.src = item.image; image.alt = item.name;
    image.referrerPolicy = 'no-referrer';
    return image;
  }
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
  error(); renderOutfit(); renderShop();
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
      info.append(element('span', 'score', item.source === 'shop' ? `From ${item.store}` : `${item.score.toFixed(1)} / 100 color match`));
    }
    row.append(info);
    if (item) {
      const remove = element('button', 'remove-item', 'Remove');
      remove.setAttribute('aria-label', `Remove ${label}`);
      remove.addEventListener('click', () => {
        outfit[slot] = null; stop('Outfit updated. Click Try to preview your choices.');
        error(); renderOutfit(); renderShop();
      });
      row.append(remove);
    }
    $('outfit').append(row);
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
    const connected = await connectTryOn({apiKey: token.apiKey, stream, items, signal, occasion: activeOccasion,
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
window.addEventListener('pagehide', () => stop());
if (!valid) $('no-scan').hidden = false;
else {
  $('fitting-room').hidden = false;
  $('summary').textContent = `${result.profile?.season || 'Your personal'} palette · recommended looks based on your skin, hair, and eye colors.`;
  for (const color of (result.recommended_colors || [])) {
    const card = element('button', 'swatch palette-choice'); card.type = 'button'; card.dataset.hex = color.hex; card.setAttribute('aria-label', `Find clothes in ${color.name}`); card.setAttribute('aria-pressed', 'false'); card.addEventListener('click', () => chooseColor(color)); const fill = element('div', 'swatch-color'); fill.style.background = color.hex;
    const text = element('div', 'swatch-text'); text.append(element('strong', '', color.name), element('span', '', `${Number(color.score).toFixed(1)} / 100`)); card.append(fill, text); $('palette').append(card);
  }
  renderOutfit(); stop('Choose a product below, then click Try.');
}

// Real product shopping, filtered by palette color, category and occasion.
let shopRequest;
let shopLoading = false, shopQueued = false;
function httpsURL(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
async function loadShop() {
  if (shopLoading) { shopQueued = true; return; }
  shopLoading = true;
  activeOccasion = $('occasion').value.trim();
  shopRequest?.abort();
  shopRequest = new AbortController();
  const current = shopRequest;
  const timeout = setTimeout(() => current.abort(), 75000);
  shopItems = []; $('shop-products').replaceChildren(); $('shop-retry').hidden = true; $('shop-note').textContent = '';
  $('shop-status').textContent = 'Finding clothes in your palette…';
  try {
    const colors = (selectedColor ? [selectedColor] : result.recommended_colors || []).slice(0, 100).map(({name, hex, score}) => ({name, hex, score}));
    const response = await fetch('/api/clothing/search', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({colors, category: $('shop-category').value, occasion: activeOccasion}), signal: current.signal});
    const data = await response.json();
    if (shopQueued) return;
    if (!response.ok) throw new Error(data.error || 'Clothing search is unavailable.');
    if (shopRequest !== current) return;
    shopItems = data.products || [];
    renderShop();
    const count = $('shop-products').childElementCount;
    $('shop-status').textContent = count ? `${count} pieces found${data.partial ? ' · some searches were unavailable' : ''}.` : 'No close photo-color matches found. Try another color or category.';
    $('shop-retry').hidden = !data.partial && count > 0;
    $('shop-note').textContent = data.note || '';
  } catch (e) {
    if (shopRequest !== current) return;
    $('shop-status').textContent = e.name === 'AbortError' ? 'The search timed out. Please retry.' : e.message;
    $('shop-retry').hidden = false;
  } finally {
    clearTimeout(timeout); shopLoading = false;
    if (shopQueued) { shopQueued = false; loadShop(); }
  }
}
$('occasion-form').addEventListener('submit', event => { event.preventDefault(); loadShop(); });
$('shop-category').addEventListener('change', loadShop);
$('shop-retry').addEventListener('click', loadShop);
window.addEventListener('pagehide', () => shopRequest?.abort());
if (valid && result.recommended_colors?.length) loadShop();

function renderShop() {
  $('shop-products').replaceChildren();
  for (const item of shopItems) {
      const url = httpsURL(item.url); if (!url) continue;
      const selected = outfit[slotFor(item)]?.id === `shop:${item.id}`;
      const card = element('article', `garment-card shop-card${selected ? ' selected' : ''}`);
      const art = element('div', 'garment-art');
      const imageURL = httpsURL(item.image);
      if (imageURL) {
        const image = document.createElement('img'); image.src = imageURL; image.alt = item.name;
        image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => art.replaceChildren(element('span', 'muted', 'Photo unavailable')), {once: true});
        art.append(image);
      } else art.append(element('span', 'muted', 'Photo unavailable'));
      const info = element('div', 'garment-info');
      info.append(element('span', 'category', item.brand || item.store), element('h3', '', item.name));
      if (Number.isFinite(item.price)) {
        let price;
        try { price = new Intl.NumberFormat(undefined, {style: 'currency', currency: item.currency}).format(item.price); }
        catch { price = `${item.price.toFixed(2)} ${item.currency || ''}`; }
        info.append(element('p', 'product-price', price));
      } else info.append(element('p', 'muted', 'Check price at store'));
      const match = element('p', 'product-match', `Searched for ${item.palette_name}`);
      if (/^#[0-9a-f]{6}$/i.test(item.palette_hex)) { const dot = element('i', 'match-dot'); dot.style.background = item.palette_hex; match.prepend(dot); }
      info.append(match);
      if (item.photo_color_match) {
        const detail = element('p', 'muted', `Photo color ${item.photo_color_match.measured_hex} · closer matches shown first`);
        info.append(detail);
      }
      const link = element('a', 'shop-link', `Shop at ${item.store} ↗`);
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer sponsored';
      info.append(link);
      const button = element('button', '', selected ? 'Selected' : 'Add to outfit');
      button.setAttribute('aria-label', `Select product ${item.name}`);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = !/^\/api\/clothing\/image\/[A-Za-z0-9_-]+$/.test(item.reference_image || '');
      if (button.disabled) button.title = 'This product has no usable reference photo for try-on.';
      button.addEventListener('click', () => select({...item, id: `shop:${item.id}`, source: 'shop', color: '', hex: item.palette_hex}));
      info.append(button);
      if (button.disabled) info.append(element('p', 'muted', 'Try-on unavailable: no product photo.'));
      card.append(art, info); $('shop-products').append(card);
    }

}

function chooseColor(color) {
  selectedColor = color;
  for (const button of $('palette').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.hex === color?.hex));
  }
  $('all-colors').setAttribute('aria-pressed', String(!color));
  $('color-filter-status').textContent = color ? `Finding clothes in ${color.name} · ${color.hex}` : 'Searching your top palette colors';
  loadShop();
}
$('all-colors').addEventListener('click', () => chooseColor(null));
