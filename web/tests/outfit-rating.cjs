// Synthetic preview and mocked provider: verifies rating UI without paid API calls.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.TEST_BASE_URL || 'http://localhost:5174';
  await page.goto(base);
  const profile={skin:{lab:[55,12,22],confidence:.9},hair:{lab:[20,3,5],confidence:.8},eyes:{lab:[30,5,8],confidence:.7}};
  await page.evaluate(profile=>sessionStorage.setItem('fitting-room-scan',JSON.stringify({profile,recommended_colors:[{name:'Teal',hex:'#008080',score:90}]})),profile);
  await page.route('**/api/clothing/search',r=>r.fulfill({json:{products:[{id:'shirt',name:'Test shirt',category:'Tops',store:'Example',url:'https://example.com/shirt',palette_hex:'#008080',reference_image:'/api/clothing/image/test'}]}}));
  await page.route('**/api/try-on/token',r=>r.fulfill({json:{apiKey:'mock'}}));
  await page.route('**/tryon-assets/sdk.js',r=>r.fulfill({contentType:'application/javascript',body:`export async function connectTryOn({stream,onRemoteStream}){onRemoteStream(stream);return {disconnect(){}};}`}));
  let calls=0, mode='success', release;
  await page.route('**/api/outfit/rate',async r=>{
   calls++; const body=r.request().postDataJSON();assert.deepEqual(Object.keys(body).sort(),['accessories','pant','shirt_layer']);assert.equal(body.shirt_layer[0].hex,'#008080');
   if(mode==='delay') await new Promise(resolve=>release=resolve);
   if(mode==='error') return r.fulfill({status:422,json:{error:'Not enough clothing is clearly visible.'}});
   await r.fulfill({json:{overall_score:8,harmony_type:'neutral-anchored',subscores:{shirt_pant_harmony:8,accessory_cohesion:null,contrast:7,balance:8},summary:'Colors work well together.',what_works:'Balanced colors.',improvement:'Try cream.',suggested_hex:'#F5F5F0'}}).catch(()=>{});
  });
  await page.goto(base+'/try-on');assert(await page.locator('#rate-outfit').isDisabled());assert.equal(calls,0);
  await page.getByRole('button',{name:'Select product Test shirt'}).click();
  assert.equal(await page.locator('#rate-outfit').isDisabled(),false);
  await page.locator('#rate-outfit').click();await page.locator('#rating-result').waitFor({state:'visible'});assert.equal(calls,1);
  await page.locator('#try').click();
  await page.waitForFunction(()=>document.getElementById('session-badge').textContent==='LIVE TRY-ON' && document.getElementById('output').readyState>=2);
  await page.locator('#rate-outfit').click();await page.locator('#rating-result').waitFor({state:'visible'});
  assert.equal(await page.locator('#rating-score').innerText(),'8 / 10');assert.equal(calls,2);
  mode='error';await page.locator('#rate-outfit').click();await page.locator('#rating-error').waitFor({state:'visible'});assert(await page.locator('#rating-result').isHidden());
  mode='delay';await page.locator('#rate-outfit').click();await page.waitForTimeout(200);
  await page.getByRole('button',{name:'Remove Shirt / layer',exact:true}).click();release();
  await page.waitForTimeout(200);assert(await page.locator('#rating-result').isHidden());assert(await page.locator('#rate-outfit').isDisabled());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  mode='success';
  await page.getByRole('button',{name:'Select product Test shirt'}).click();
  await page.unroute('**/api/clothing/search');
  await page.route('**/api/clothing/search',r=>r.fulfill({json:{products:[{id:'layer',name:'Test layer',category:'Layers',store:'Example',url:'https://example.com/layer',palette_hex:'#008080',reference_image:'/api/clothing/image/layer'}]}}));
  await page.selectOption('#shop-category','Layers');
  await page.getByRole('button',{name:'Select product Test layer'}).click();
  assert.equal(await page.locator('[data-slot=shirt]').count(),2);
  await page.locator('[data-slot=shirt]').first().getByRole('button',{name:'Make outermost'}).click();
  assert.match(await page.locator('[data-slot=shirt]').last().innerText(),/Test shirt/);
  const sent=page.waitForRequest(r=>r.url().endsWith('/api/outfit/rate'));
  await page.locator('#rate-outfit').click();
  assert.deepEqual((await sent).postDataJSON().shirt_layer.map(i=>i.item),['Test layer','Test shirt']);
  await page.locator('#rating-result').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('PASS: selected-color contract, 1–10 display, errors, cancellation, mobile, multiple layers and outermost order');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
