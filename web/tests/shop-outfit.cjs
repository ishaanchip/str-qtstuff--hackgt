// Real product-reference composition, mocked search/Decart: no provider credits.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(()=>sessionStorage.setItem('fitting-room-scan',JSON.stringify({
   profile:{season:'Autumn'},recommended_colors:[{name:'Teal',hex:'#008080',score:90}],
   clothing:[{id:1,name:'Demo shirt',category:'Tops',color:'Teal',hex:'#008080',score:90}]})));
  const requests=[]; let images=0,tokens=0;
  await page.route('**/api/clothing/search',route=>{
   const payload=route.request().postDataJSON();requests.push(payload);
   const pants=payload.category==='Bottoms';
   return route.fulfill({json:{products:[{id:pants?'pants':'shirt',name:pants?'Wedding trousers':'Linen shirt',
    category:payload.category === 'All' ? 'Tops' : payload.category,brand:'Example',store:'nike.com',url:'https://nike.com/product',image:null,
    reference_image:'/api/clothing/image/'+(pants?'pants':'shirt'),price:50,currency:'USD',palette_name:'Teal',palette_hex:'#008080'}]}});
  });
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=30;const x=c.getContext('2d');x.fillStyle='teal';x.fillRect(0,0,20,30);return c.toDataURL().split(',')[1];});
  await page.route('**/api/clothing/image/*',route=>{images++;return route.fulfill({contentType:'image/png',body:Buffer.from(png,'base64')});});
  await page.route('**/api/try-on/token',route=>{tokens++;return route.fulfill({json:{apiKey:'mock-only'}});});
  await page.route('**/tryon-assets/sdk.js',route=>route.fulfill({contentType:'application/javascript',body:`
   import {productReference} from '/tryon-assets/sdk.js?reference-test';
   export async function connectTryOn({items,stream,signal,occasion,onRemoteStream}) {
    const image=await productReference(items,signal);
    window.referenceSize=image?.size;window.referenceType=image?.type;
    window.selectedProducts=items;window.occasionSent=occasion;
    onRemoteStream(stream);return {disconnect(){}};
   }`}));
  await page.goto('http://localhost:5173/try-on');
  await page.getByRole('button',{name:'Select product Linen shirt'}).click();
  assert.match(await page.locator('[data-slot=shirt]').innerText(),/Linen shirt/);
  assert.equal(tokens,0);assert.equal(images,0);
  await page.locator('#occasion').fill('Outdoor wedding, smart casual');
  await page.getByRole('button',{name:'Find clothes',exact:true}).click();
  await page.locator('.shop-card').waitFor();
  assert.equal(requests.at(-1).occasion,'Outdoor wedding, smart casual');
  await page.selectOption('#shop-category','Bottoms');await page.getByRole('button',{name:'Select product Wedding trousers'}).click();
  assert.match(await page.locator('[data-slot=shirt]').innerText(),/Linen shirt/);
  assert.equal(await page.locator('#outfit .remove-item').count(),2);
  await page.locator('#try').click();
  await page.waitForFunction(()=>document.getElementById('session-badge').textContent==='LIVE TRY-ON');
  assert.equal(tokens,1);assert.equal(images,2);
  assert.equal(await page.evaluate(()=>window.referenceType),'image/png');
  assert(await page.evaluate(()=>window.referenceSize>0));
  assert.deepEqual(await page.evaluate(()=>window.selectedProducts.map(i=>i.id)),['shop:shirt','shop:pants']);
  assert.equal(await page.evaluate(()=>window.occasionSent),'Outdoor wedding, smart casual');
  await page.getByRole('button',{name:'Remove Pants',exact:true}).click();
  assert.equal(await page.locator('#session-badge').innerText(),'PREVIEW OFF');
  assert.equal(await page.locator('#input').evaluate(v=>v.srcObject),null);
  // A failed reference must not silently start a text-only preview.
  await page.unroute('**/api/clothing/image/*');
  await page.route('**/api/clothing/image/*',route=>route.fulfill({status:422,json:{error:'expired'}}));
  await page.locator('#try').click();await page.locator('#error').waitFor({state:'visible'});
  assert.match(await page.locator('#error').innerText(),/Could not load the photo/);
  assert.equal(await page.locator('#input').evaluate(v=>v.srcObject),null);
  await page.locator('#occasion').fill('');await page.getByRole('button',{name:'Find clothes',exact:true}).click();
  await page.locator('.shop-card').waitFor();assert.equal(requests.at(-1).occasion,'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/shop-outfit-mobile.png',fullPage:true});
  console.log('PASS: occasion query/clear, product selection, persistent slots, reference PNG composition, Try gating, stop, image failure, mobile');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
