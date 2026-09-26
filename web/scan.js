const $ = (id) => document.getElementById(id);
let stream, photo, previewURL, busy = false;
const error = (message = '') => { $('error').textContent = message; $('error').hidden = !message; };
function stopCamera() {
  stream?.getTracks().forEach(track => track.stop()); stream = null;
  $('camera').srcObject = null; $('camera').hidden = true; $('camera-actions').hidden = true;
  $('preview').hidden = !photo; $('placeholder').hidden = Boolean(photo);
}
function clearResults() { $('results').hidden = true; $('results-empty').hidden = false; $('clothing-section').hidden = true; }
function selectPhoto(blob) {
  if (!['image/jpeg', 'image/png'].includes(blob.type)) { error('Choose a JPEG or PNG photo.'); return; }
  if (blob.size > 10 * 1024 * 1024) { error('Choose an image smaller than 10 MB.'); return; }
  photo = blob; stopCamera(); if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(blob); $('preview').src = previewURL;
  $('preview').hidden = false; $('placeholder').hidden = true; $('analyze').disabled = false;
  $('status').textContent = 'Photo ready. Discover your palette when you’re ready.'; error(); clearResults();
}
$('photo').addEventListener('change', e => { if (e.target.files[0]) selectPhoto(e.target.files[0]); e.target.value = ''; });
$('open-camera').addEventListener('click', async () => {
  error(); stopCamera(); $('open-camera').disabled = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable. Open this page on localhost or upload a photo.');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    $('camera').srcObject = stream; $('camera').hidden = false; $('preview').hidden = true; $('placeholder').hidden = true;
    $('camera-actions').hidden = false; await $('camera').play();
    $('status').textContent = 'Face forward in daylight, then capture your photo.';
  } catch (e) { stopCamera(); error(e.name === 'NotAllowedError' ? 'Camera access was denied. Allow access or upload a photo instead.' : e.message); }
  finally { $('open-camera').disabled = false; }
});
$('close-camera').addEventListener('click', stopCamera);
$('capture').addEventListener('click', () => {
  const video = $('camera'); if (!video.videoWidth) { error('Camera is warming up. Try again in a moment.'); return; }
  const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => { if (blob) selectPhoto(blob); else error('Could not capture photo. Try uploading one.'); }, 'image/jpeg', .94);
});
$('analyze').addEventListener('click', async () => {
  if (!photo || busy) return; busy = true; error(); stopCamera(); clearResults();
  for (const id of ['analyze', 'open-camera', 'photo']) $(id).disabled = true;
  $('status').textContent = 'Analyzing your portrait… this may take a few seconds.';
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': photo.type }, body: photo, signal: controller.signal });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Analysis failed.');
    sessionStorage.setItem('fitting-room-scan', JSON.stringify(result));
    window.location.assign('/try-on');
  } catch (e) { error(e.name === 'AbortError' ? 'The scan timed out. Try again with a smaller photo.' : e.message); $('status').textContent = 'Scan unsuccessful. You can try another photo.'; }
  finally { clearTimeout(timeout); busy = false; for (const id of ['analyze', 'open-camera', 'photo']) $(id).disabled = false; }
});
window.addEventListener('pagehide', () => { stopCamera(); if (previewURL) URL.revokeObjectURL(previewURL); });
