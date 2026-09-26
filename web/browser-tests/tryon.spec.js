import { test, expect } from '@playwright/test';

async function uploadShirt(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3c654f';
    ctx.fillRect(20, 10, 88, 110);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#shirt-upload').setInputFiles({ name: 'test-shirt.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await expect(page.locator('#shirt-preview')).toBeVisible();
}

test('missing key shows setup, supports upload, and keeps Start disabled', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#setup')).toBeVisible();
  await uploadShirt(page);
  await expect(page.locator('#filename')).toContainText('1 item selected');
  await expect(page.locator('#start')).toBeDisabled();
  await page.screenshot({ path: '../output/lucy-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('camera refusal is actionable and resets controls', async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({ json: { configured: true } }));
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  });
  await page.goto('/');
  await uploadShirt(page);
  await page.locator('#start').click();
  await expect(page.locator('#error')).toContainText('Allow camera access');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#stop')).toBeDisabled();
});

test('token failure cleans up camera and displays server setup error', async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/realtime-token', (route) => route.fulfill({ status: 503, json: { error: 'Set DECART_API_KEY in web/.env.local and restart the server.' } }));
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      window.testCameraStream = canvas.captureStream();
      return window.testCameraStream;
    };
  });
  await page.goto('/');
  await uploadShirt(page);
  await page.locator('#start').click();
  await expect(page.locator('#error')).toContainText('DECART_API_KEY');
  await expect(page.locator('#start')).toBeEnabled();
  expect(await page.evaluate(() => window.testCameraStream.getTracks().every((t) => t.readyState === 'ended'))).toBe(true);
  expect(await page.locator('#video-input').evaluate((video) => video.srcObject)).toBeNull();
});

test('mobile layout fits viewport and invalid images are rejected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#setup')).toBeVisible();
  await page.locator('#shirt-upload').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#start')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '../output/lucy-mobile.png', fullPage: true });
});

async function imageFile(page, name, color) {
  const data = await page.evaluate((color) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    return canvas.toDataURL().split(',')[1];
  }, color);
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}

test('shirt, jeans, and multiple accessories are sent together on start and update', async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({ json: { configured: true } }));
  // Capture the UI-to-session payload without touching a real camera or Decart.
  // Session tests separately verify forwarding this payload to connect()/set().
  await page.route('**/src/session.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export class TryOnSession {
      constructor(options) { this.options = options; this.state = 'idle'; window.outfitCalls = []; }
      async record(image, prompt) {
        const bitmap = await createImageBitmap(image);
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
        window.outfitCalls.push({ prompt, width: canvas.width, height: canvas.height,
          colors: [[256,256],[768,256],[256,768],[768,768]].filter(([x,y]) => x < canvas.width && y < canvas.height)
            .map(([x,y]) => [...ctx.getImageData(x,y,1,1).data]) }); bitmap.close();
      }
      async start(image, prompt) { await this.record(image, prompt); this.state='live'; this.options.onState('live'); }
      async apply(image, prompt) { await this.record(image, prompt); return true; }
      stop() { this.state='idle'; this.options.onState('idle'); }
    }` }));
  await page.goto('/');
  await page.locator('#shirt-upload').setInputFiles(await imageFile(page, 'shirt.png', '#ff0000'));
  await page.locator('#jeans-upload').setInputFiles(await imageFile(page, 'jeans.png', '#0000ff'));
  await page.locator('#accessories-upload').setInputFiles([
    await imageFile(page, 'hat.png', '#00ff00'), await imageFile(page, 'bag.png', '#ffff00'),
  ]);
  await expect(page.locator('#filename')).toContainText('4 items selected');
  await page.locator('#start').click();
  await expect(page.locator('#apply')).toBeEnabled();
  const first = await page.evaluate(() => window.outfitCalls[0]);
  expect(first.width).toBe(1024);
  expect(first.height).toBe(1024);
  expect(first.prompt).toContain('Shirt, Jeans, Accessory 1, Accessory 2');
  expect(first.colors).toEqual([[255,0,0,255], [0,0,255,255], [0,255,0,255], [255,255,0,255]]);
  await page.getByRole('button', { name: 'Remove hat.png' }).click();
  await expect(page.locator('#filename')).toContainText('3 items selected');
  await page.locator('#apply').click();
  await expect(page.locator('#filename')).toContainText('Outfit applied');
  expect(await page.evaluate(() => window.outfitCalls[1].prompt)).toContain('Shirt, Jeans, Accessory 1.');
  expect(await page.evaluate(() => window.outfitCalls[1].colors[2])).toEqual([255,255,0,255]);
  await page.screenshot({ path: '../output/lucy-outfit.png', fullPage: true });
});

test('jeans-only works and rejected uploads preserve selected items', async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({ json: { configured: true } }));
  await page.goto('/');
  await page.locator('#jeans-upload').setInputFiles(await imageFile(page, 'jeans.png', '#0000ff'));
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#jeans-upload').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#jeans-items img')).toHaveAttribute('alt', 'Jeans: jeans.png');
  const accessory = await imageFile(page, 'hat.png', '#00ff00');
  await page.locator('#accessories-upload').setInputFiles(Array.from({ length: 5 }, (_, i) => ({ ...accessory, name: `item${i}.png` })));
  await expect(page.locator('#error')).toContainText('up to 4');
  await expect(page.locator('#accessories-items img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove jeans.png' }).click();
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#reference-details')).toBeHidden();
});
