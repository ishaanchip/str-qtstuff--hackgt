// No provider calls: run against the local server with node web/tests/try-on.cjs.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5173';
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let tokens = 0, sdkLoads = 0;
    await page.route('**/api/try-on/token', route => {
      tokens++;
      assert.equal(route.request().headers()['x-try-on-intent'], 'try');
      return route.fulfill({json: {apiKey: 'test-only'}});
    });
    await page.route('**/tryon-assets/sdk.js', route => {
      sdkLoads++;
      return route.fulfill({contentType: 'application/javascript', body: `export async function connectTryOn({stream, items, onRemoteStream}) { window.testOutfit = items; onRemoteStream(stream); return {disconnect() {}}; }`});
    });
    await page.route('**/api/analyze', route => route.fulfill({json: {
      profile: {season: 'Autumn'}, recommended_colors: [], clothing: [
        {id: 1, name: 'Linen shirt', category: 'Tops', color: 'Ivory', hex: '#FFFFF0', score: 90},
        {id: 2, name: 'Trousers', category: 'Bottoms', color: 'Navy', hex: '#000080', score: 80},
        {id: 3, name: 'Woven scarf', category: 'Accessories', color: 'Sage', hex: '#9CAF88', score: 75},
        {id: 4, name: 'Baseball cap', category: 'Accessories', color: 'Navy', hex: '#000080', score: 70},
      ],
    }}));
    await page.goto(`${baseURL}/try-on`);
    await page.locator('#no-scan').waitFor({state: 'visible'});
    await page.goto(baseURL);
    await page.locator('#photo').setInputFiles({name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from('mock portrait')});
    await page.locator('#analyze').click();
    await page.waitForURL('**/try-on');
    await page.locator('#fitting-room').waitFor({state: 'visible'});
    assert.equal(await page.locator('.garment-card').count(), 4);
    await page.selectOption('#category', 'Bottoms');
    await page.getByRole('button', {name: 'Select Navy Trousers'}).click();
    await page.selectOption('#category', 'Accessories');
    await page.getByRole('button', {name: 'Select Sage Woven scarf'}).click();
    assert.equal(await page.locator('#outfit .remove-item').count(), 3);
    assert.match(await page.locator('[data-slot=shirt]').innerText(), /Linen shirt/);
    assert.match(await page.locator('[data-slot=pants]').innerText(), /Trousers/);
    assert.equal(tokens, 0); assert.equal(sdkLoads, 0);
    assert.equal(await page.locator('#input').evaluate(video => video.srcObject), null);
    await page.locator('#try').click();
    await page.waitForFunction(() => document.getElementById('session-badge').textContent === 'LIVE TRY-ON');
    assert.equal(tokens, 1); assert.equal(sdkLoads, 1);
    await page.evaluate(() => { window.testTracks = document.getElementById('input').srcObject.getTracks(); });
    assert.deepEqual(await page.evaluate(() => window.testOutfit.map(item => item.id)), [1, 2, 3]);
    await page.getByRole('button', {name: 'Select Navy Baseball cap'}).click();
    assert.equal(await page.locator('#session-badge').innerText(), 'PREVIEW OFF');
    assert.equal(tokens, 1);
    assert.match(await page.locator('[data-slot=accessory]').innerText(), /Baseball cap/);
    assert(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended')));
    assert.equal(await page.locator('#input').evaluate(video => video.srcObject), null);
    await page.locator('#try').click();
    await page.waitForFunction(() => document.getElementById('session-badge').textContent === 'LIVE TRY-ON');
    assert.deepEqual(await page.evaluate(() => window.testOutfit.map(item => item.id)), [1, 2, 4]);
    await page.locator('#stop').click();
    for (const label of ['Shirt / layer', 'Pants', 'Accessory']) await page.getByRole('button', {name: `Remove ${label}`, exact: true}).click();
    assert(await page.locator('#try').isDisabled());
    await page.reload();
    await page.locator('#fitting-room').waitFor({state: 'visible'});
    assert.equal(tokens, 2); assert.equal(sdkLoads, 1);
    await page.selectOption('#category', 'All clothing');
    await page.screenshot({path: '/tmp/outfit-desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: '/tmp/outfit-mobile.png', fullPage: true});
    assert.deepEqual(errors, []);
    console.log('PASS: scan redirect, recommendations, filtering, no API/SDK/camera before Try, combined outfit, accessory replacement, removal, stop, idle reload, mobile layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
