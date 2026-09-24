const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(read(path)).toString('base64'));
(async()=>{
 const api=await load('functions/api/ask-map.js'),products=await load('functions/api/product-info.js');
 const base={relevant:true,city:'hcmc',district:'',area:'',category:'restaurant',subcategory:'',terms:[],preferences:[],unsupported:[]};
 const req=query=>new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query,city:'hcmc'})});
 let fastCalls=0;
 const quick=await api.onRequest({request:req('맛있는 햄버거집 찾아서 그랩푸드로 연결해줘'),env:{AI:{run(){fastCalls++;throw Error('down')}}}});
 assert.equal(quick.status,200);assert.equal((await quick.json()).intent.action,'grabfood');assert.equal(fastCalls,0,'fully understood food action is independent of inference availability');
 const used=[];const recovered=await api.onRequest({request:req('동태탕 메뉴 있는 한식당'),env:{AI:{run:async model=>{used.push(model);if(used.length===1)return {response:'not JSON'};return {response:JSON.stringify({...base,subcategory:'한식',terms:['동태탕']})};}}}});
 assert.equal(recovered.status,200);assert.equal(used.length,2);assert.equal(used[0],'@cf/zai-org/glm-5.3-flash');assert.equal(used[1],'@cf/zai-org/glm-4.7-flash');assert.equal((await recovered.json()).model,used[1],'response identifies the model that actually succeeded');
 for(const q of ['맛있는 햄버거집 찾아서 그랩푸드로 연결해줘','1군 수제버거 그랩 푸드 주문','find a burger and connect to GrabFood']){
  const result=api.extendIntent({...base,terms:['햄버거집','그랩푸드','배달'],unsupported:['그랩푸드 연결']},q,'hcmc');
  assert.equal(result.action,'grabfood');assert.equal(result.category,'restaurant');assert.deepEqual(result.terms,['햄버거']);assert.deepEqual(result.unsupported,[]);
 }
 const q='호치민에서 아이폰 듀오를 가장 저렴하게 구입할 수 있는 매장 찾아줘';
 const retail=api.extendIntent({...base,category:'shopping',productName:'아이폰 17',guideTopic:'exchange',terms:[],preferences:['cheap']},q,'hcmc');
 assert.equal(retail.productName,'아이폰 듀오','never replace the user model');assert.equal(retail.action,'purchase');assert(!retail.guideTopic);assert(!retail.sortBy);
 assert.equal(products.appleProduct('아이폰 듀오').slug,'iphone-duo');assert.equal(products.appleProduct('아이폰 18 프로 맥스 256GB').slug,'iphone-18-pro');
 for(const p of ['iphone https://evil.test','iphone-../../secret','아이폰 듀오 케이스','not a phone','아이폰 가짜모델'])assert.equal(products.appleProduct(p),null,p);
 const apple=products.appleProduct('아이폰 듀오');
 const html='<title>iPhone Duo - Apple (VN)</title><p>iPhone Duo sẽ có hàng tại apple.com/vn, cũng như tại các cửa hàng của một số nhà mạng và đối tác chọn lọc từ ngày 23 tháng 10 năm 2026.</p>';
 assert.equal(products.releaseFrom(html,apple),'2026-10-23');assert.equal(products.releaseFrom('<p>iPhone 18 có hàng ngày 23 tháng 10 năm 2026.</p>',apple),null);
 let fetchCount=0;const fetcher=async url=>{fetchCount++;assert.equal(url,apple.url);return new Response(html,{headers:{'content-type':'text/html'}});};
 const info=await products.lookupProduct('아이폰 듀오',{fetcher,now:new Date('2026-09-24')});assert.equal(info.status,'upcoming');assert(info.fresh);
 assert.equal((await products.lookupProduct('아이폰 듀오',{fetcher,now:new Date('2026-11-24')})).status,'price_unverified','past release is not proof of stock');
 const failed=async()=>{throw Error('offline')};
 const fallback=await products.lookupProduct('아이폰 듀오',{fetcher:failed,now:new Date('2026-09-24')});assert(!fallback.fresh);assert.equal(fallback.status,'upcoming');
 assert.equal((await products.lookupProduct('아이폰 듀오',{fetcher:failed,now:new Date('2026-10-02')})).status,'unverified','dated announcement expires');
 await products.lookupProduct('http://127.0.0.1',{fetcher});assert.equal(fetchCount,2,'untrusted text never causes arbitrary URL requests');
 assert(JSON.parse(read('_routes.json')).include.includes('/api/product-info'));
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test/',runScripts:'outside-only'}),w=dom.window,d=w.document,run=code=>vm.runInContext(code,dom.getInternalVMContext());
  w.matchMedia=()=>({matches:width<900});w.requestAnimationFrame=()=>0;
  for(const file of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+file));
  run(`const fixture={places:[{id:'mall',name:'사이공 스퀘어',category:'shopping',subcategory:'쇼핑몰',area:'호치민',lat:10.77,lng:106.7}],reviews:[{id:'r1',text:'보존할 후기',placeId:'mall'}]};db=()=>fixture;state.city='hcmc';state.sharedDbLoading=false;`);
  let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text}}});
  let googleCalls=0;w.AIGoogleSearch={search:async()=>{googleCalls++;return []}};
  run(read('assets/js/ai-result-actions.js'));run(read('assets/js/ai-map-search.js'));
  const before=run('JSON.stringify(fixture)'),apiActions=w.AIResultActions,list=d.getElementById('aiMapResults');
  for(const url of ['javascript:alert(1)','https://food.grab.com.evil.test/vn/en/restaurant/a/b','https://evil.test/','https://food.grab.com/sg/en/restaurant/a/b','https://x@food.grab.com/vn/en/restaurant/a/b'])assert.equal(apiActions.grabUrl(url),'');
  const row={name:'Burger Bros',address:'30 An Thuong 4, Da Nang'},merchant=apiActions.merchantFor(row);assert(merchant.url.includes('5-C7W1L66XDBDVKE'));
  assert.equal(apiActions.merchantFor({...row,address:'39 Nguyen Duy Hieu, Ho Chi Minh'}),null,'brand alone never selects another city/branch');
  const li=d.createElement('li');list.append(li);apiActions.appendDelivery(li,{name:'샘플 버거',address:'호치민'},{action:'grabfood'});
  assert.equal(li.querySelector('a').href,'https://food.grab.com/vn/en/');li.querySelector('button').click();await new Promise(r=>setTimeout(r,5));assert.equal(copied,'샘플 버거');assert.match(li.textContent,/복사됨/);assert(!li.querySelector('button a, button button'));
  w.fetch=async url=>({ok:true,json:async()=>String(url).includes('product-info')?info:{intent:retail}});
  d.getElementById('aiMapQuestion').value=q;d.getElementById('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,15));
  assert.equal(googleCalls,0,'purchase must never fall through to maps');assert.equal(list.querySelectorAll('.aiResult').length,0);assert.match(list.textContent,/2026-10-23/);assert(!list.textContent.includes('사이공 스퀘어'));
  assert(list.querySelector('a').href.startsWith('https://www.apple.com/vn/'));
  let finish;w.fetch=()=>new Promise(resolve=>{finish=resolve});apiActions.renderProduct(list,retail);apiActions.cancel();list.replaceChildren();finish({ok:true,json:async()=>info});await new Promise(r=>setTimeout(r,5));assert.equal(list.childElementCount,0,'late product facts cannot reopen a cleared result');
  assert.equal(run('JSON.stringify(fixture)'),before);dom.window.close();
 }
 console.log('PASS intent/action split, source-bound products, release dates, expiry, SSRF, no false price ranking, Grab branch/copy links, stale replies and read-only data');
})().catch(e=>{console.error(e);process.exitCode=1});
