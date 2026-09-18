// UI/history and link contracts with native dialog presentation emulated.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,35));
async function fixture({url='https://example.test/guide/',saved=[],blocked=false,clipboard=true}={}){
 const dom=new JSDOM(read('guide/index.html'),{url,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 w.localStorage.setItem('viettrip_saved_guides_v1',JSON.stringify(saved));w.localStorage.setItem('viettrip_google_db_v1','preserve-map');
 if(blocked)w.Storage.prototype.setItem=function(){throw new Error('denied')};
 const copied=[];Object.defineProperty(w.navigator,'clipboard',{value:clipboard?{writeText:async v=>copied.push(v)}:undefined});
 const c=dom.getInternalVMContext();for(const file of ['travel-guide-data.js','travel-guide.js'])vm.runInContext(read('assets/js/'+file),c,{filename:file});
 return {w,dom,copied,id:x=>w.document.getElementById(x),select:s=>w.document.querySelector(s),click:s=>w.document.querySelector(s).click(),close:()=>w.close()};
}
(async()=>{
 const f=await fixture();assert.equal(f.w.document.querySelectorAll('.guideCard').length,13);
 f.id('guideSearch').value='환전';f.id('guideSearch').dispatchEvent(new f.w.Event('input'));assert.equal(f.w.document.querySelectorAll('.guideCard').length,1);assert.match(f.id('guideCards').textContent,/환전할 때/);
 f.id('guideSearch').value='<script>alert(1)</script>';f.id('guideSearch').dispatchEvent(new f.w.Event('input'));assert(!f.id('resultSummary').querySelector('script'));assert(!f.id('guideEmpty').hidden);
 f.id('emptyReset').click();f.click('[data-read="stay-choice"]');assert(f.id('articleDialog').open);
 assert.equal(new URL(f.w.location.href).searchParams.get('read'),'stay-choice');
 const benefit=[...f.id('articleActions').querySelectorAll('a')].find(a=>a.textContent.includes('혜택 있는'));
 assert.equal(new URL(benefit.href).searchParams.get('category'),'stay');assert.equal(new URL(benefit.href).searchParams.get('benefit'),'1');
 f.id('requestTemplate').value+='\n수정한 문의';f.id('copyRequest').click();await wait();assert.match(f.copied[0],/수정한 문의/);
 f.id('saveArticle').click();assert.equal(f.id('saveArticle').getAttribute('aria-pressed'),'true');assert.deepEqual(JSON.parse(f.w.localStorage.getItem('viettrip_saved_guides_v1')),['stay-choice']);
 f.w.history.back();await wait();assert(!f.id('articleDialog').open);assert.equal(f.w.location.pathname,'/guide/');assert(!new URL(f.w.location.href).searchParams.has('read'));
 f.w.history.forward();await wait();assert(f.id('articleDialog').open);assert.match(f.id('articleTitle').textContent,/숙소/);
 f.id('closeArticle').click();await wait();assert(!f.id('articleDialog').open);
 f.id('navSaved').click();assert.equal(f.w.document.querySelectorAll('.guideCard').length,1);f.click('[data-save="stay-choice"]');assert(!f.id('guideEmpty').hidden);
 f.id('navBenefits').click();assert.equal(f.w.document.querySelectorAll('.guideCard').length,1);assert.match(f.id('guideCards').textContent,/회원 혜택/);
 assert.equal(f.w.localStorage.getItem('viettrip_google_db_v1'),'preserve-map');f.close();

 const direct=await fixture({url:'https://example.test/guide/?city=hcmc&read=airport-arrival'});assert(direct.id('articleDialog').open);direct.id('articleDialog').dispatchEvent(new direct.w.Event('cancel',{cancelable:true}));await wait();assert(!direct.id('articleDialog').open);assert.equal(direct.w.location.pathname,'/guide/');direct.close();
 const cities=await fixture({saved:['airport-arrival']});cities.id('guideCity').value='danang';cities.id('guideCity').dispatchEvent(new cities.w.Event('change'));
 assert(!cities.select('[data-read="airport-arrival"]'));assert(!cities.select('[data-read="river-trip"]'));assert(!cities.select('[data-read="city-bus"]'));
 cities.id('startAirportGuide').click();assert.match(cities.id('articleTitle').textContent,/내 공항/);assert.equal(new URL(cities.id('articleActions').querySelector('a').href).searchParams.get('city'),'danang');
 cities.id('closeArticle').click();await wait();cities.id('navSaved').click();assert(cities.select('[data-read="airport-arrival"]'),'saved HCMC guides remain discoverable in another city');cities.click('[data-read="airport-arrival"]');assert.equal(cities.id('guideCity').value,'hcmc');assert.equal(new URL(cities.id('articleActions').querySelector('a').href).searchParams.get('city'),'hcmc');cities.close();
 const denied=await fixture({blocked:true,clipboard:false});denied.click('[data-save="exchange"]');denied.click('[data-save="stay-choice"]');assert.equal(denied.id('savedCount').textContent,'2');assert.match(denied.id('guideToast').textContent,/이번 화면/);
 denied.click('[data-read="useful-phrases"]');denied.click('[data-phrase="0"]');await wait();assert.match(denied.id('copyFallback').value,/Làm ơn/);assert(!denied.id('articleStatus').hidden);denied.close();
 const stored=await fixture({saved:['exchange','bad-id','exchange']});assert.equal(stored.id('savedCount').textContent,'1');stored.w.localStorage.removeItem('viettrip_saved_guides_v1');stored.w.dispatchEvent(new stored.w.StorageEvent('storage',{key:'viettrip_saved_guides_v1'}));assert.equal(stored.id('savedCount').textContent,'0');stored.close();

 const all=await fixture();const ids=new Set();
 const context=vm.createContext({console});vm.runInContext(read('assets/js/01-data-storage.js').split("const DBKEY=")[0],context);
 const nav=vm.runInContext('NAV_CATEGORIES.map(x=>x.id)',context),citiesOnMap=vm.runInContext('Object.keys(CITY_DATA)',context);
 for(const [city] of Object.entries(all.w.VietGuideData.cities))assert(citiesOnMap.includes(city),city);
 for(const a of all.w.VietGuideData.articles){
  assert(!ids.has(a.id));ids.add(a.id);assert(a.sections.length);assert(a.title&&a.summary);
  for(const action of a.actions||[]){if(action.category)assert(nav.includes(action.category),action.category);if(action.panel)assert(['reviews','transport'].includes(action.panel))}
  for(const id of a.sources||[]){const s=all.w.VietGuideData.sources[id];assert.equal(new URL(s.url).protocol,'https:');assert.equal(s.checked,'2026-09-18')}
 }
 all.close();
 const built=new JSDOM(read('dist-pages/guide/index.html'),{url:'https://example.test/guide/'});
 for(const el of built.window.document.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="icon"],img[src]')){const url=new URL(el.src||el.href);assert(fs.existsSync(path.join(root,'dist-pages',url.pathname)),url.pathname)}built.window.close();
 console.log('PASS 13 guides, search/empty states, save/persistence/failure, city-aware links, category+benefit intersection, editable inquiry and phrase copy, safe text, Back/Forward/Escape, direct links, build assets (native browser presentation emulated)');
})().catch(e=>{console.error(e);process.exitCode=1});
