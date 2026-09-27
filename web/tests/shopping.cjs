// Mocked provider results: no shopping API credits or camera access.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(()=>sessionStorage.setItem('fitting-room-scan',JSON.stringify({
   recommended_colors:[{name:'Teal',hex:'#008080',score:90}],profile:{season:'Autumn'},
   clothing:[{id:0,name:'Everyday tee',category:'Tops',color:'Teal',hex:'#008080',score:90}]})));
  let calls=0;
  await page.route('**/api/clothing/search', route=>{
   calls++; const payload=route.request().postDataJSON();
   assert.equal(payload.colors[0].hex,'#008080');
   if(calls===1)return route.fulfill({status:503,json:{error:'Add CHANNEL3_API_KEY to web/.env.local to enable clothing search.'}});
   return route.fulfill({json:{products:[{id:'real',name:'Cotton shirt',brand:'Nike',store:'nike.com',
    url:'https://www.buy.trychannel3.com/product',image:null,price:40,currency:'USD',palette_name:'Teal',palette_hex:'#008080'}],note:'Links open the brand store.'}});
  });
  await page.goto('http://localhost:5173/try-on');
  await page.locator('#shop-retry').waitFor({state:'visible'});
  assert.match(await page.locator('#shop-status').textContent(),/CHANNEL3_API_KEY/);
  await page.locator('#shop-retry').click();
  await page.locator('.shop-link').waitFor();
  assert.equal(await page.locator('.shop-link').getAttribute('href'),'https://www.buy.trychannel3.com/product');
  assert.match(await page.locator('.shop-card').textContent(),/\$40.00/);
  await page.locator('#shop-category').selectOption('Bottoms');
  await page.locator('.shop-link').waitFor();
  assert.equal(calls,3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/shopping-mobile.png',fullPage:true});
  console.log('PASS: palette request, missing key, retry, real product link, price, category and mobile layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
