// Run with: node web/tests/scan.cjs /path/to/portrait.jpg
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173');
    await page.locator('#open-camera').click();
    await page.waitForFunction(() => document.getElementById('camera').videoWidth > 0);
    await page.locator('#capture').click();
    await page.locator('#preview').waitFor({state: 'visible'});
    assert.equal(await page.evaluate(() => document.getElementById('camera').srcObject), null);
    await page.locator('#photo').setInputFiles(process.argv[2]);
    await page.locator('#analyze').click();
    await page.waitForURL('**/try-on', {timeout: 90000});
    await page.locator('#fitting-room').waitFor({state: 'visible'});
    assert.equal(await page.locator('.swatch').count(), 9);
    assert.equal(await page.locator('.garment-card').count(), 20);
    await page.selectOption('#category', 'Bottoms');
    assert.equal(await page.locator('.garment-card').count(), 4);
    assert.equal(await page.locator('#error').isVisible(), false);
    await page.screenshot({path: '/tmp/face-scan-desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: '/tmp/face-scan-mobile.png', fullPage: true});
    await page.goto('http://localhost:5173');
    await page.locator('#photo').setInputFiles({name:'bad.png', mimeType:'image/png', buffer:Buffer.from('invalid image')});
    await page.locator('#analyze').click();
    await page.locator('#error').waitFor({state:'visible'});
    assert.equal(await page.locator('#results').isVisible(), false);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: camera capture and release, real inference, palette, clothing filters, mobile layout, invalid image, no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
