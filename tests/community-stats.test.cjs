const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const visits=new Set();let fail=false,aggregateRequests=0,hold=false;const waiting=[];
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname.endsWith('supabase.co')){
   if(fail)return route.fulfill({status:503,body:''});
   if(req.method()==='POST'){
    const id=req.postDataJSON().id,duplicate=visits.has(id);visits.add(id);
    return route.fulfill({status:duplicate?409:201,body:''});
   }
   aggregateRequests++;
   const total=url.pathname.includes('site_visits')?visits.size:url.pathname.includes('places_public')?1234:5678;
   const finish=()=>route.fulfill({status:200,headers:{'content-range':'*/'+total,'access-control-allow-origin':'*','access-control-expose-headers':'content-range'},body:''});
   if(hold){waiting.push(finish);return;}return finish();
  }
  let file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(file.endsWith('.js')&&!/01-data-storage|community-stats/.test(file))return route.fulfill({body:''});
  if(!fs.existsSync(path.join(root,file)))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file))});
 });
 await page.goto('https://viettrip-vietnam-map.pages.dev/');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('viettrip_counted_visit_v2'))?.recorded);
 assert.equal(aggregateRequests,0,'ordinary visitors do not request dashboard counts');
 assert.equal(await page.locator('.communityStats').isVisible(),false,'no public statistics row or reserved space');
 await page.evaluate(()=>{state.isAdmin=true;CommunityStats.syncRole();});
 await page.waitForFunction(()=>document.querySelector('#totalReviews').textContent==='5,678');
 await page.waitForFunction(()=>document.querySelector('#totalVisits').textContent==='1');
 await page.reload();assert.equal(await page.locator('.communityStats').isVisible(),false);
 await page.evaluate(()=>{state.isAdmin=true;CommunityStats.syncRole();});await page.waitForFunction(()=>document.querySelector('#totalVisits').textContent==='1');
 assert.equal(visits.size,1,'reload within the 30-minute window must not double-count visits');
 for(const [width,height] of [[1440,900],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width,height});
  const result=await page.evaluate(()=>{
   const stats=document.querySelector('.communityStats'),s=stats.getBoundingClientRect();
   const header=document.querySelector('.top').getBoundingClientRect(),content=document.querySelector('.content').getBoundingClientRect();
   return {fits:stats.scrollWidth<=stats.clientWidth,noOverlap:s.top>=header.bottom-1&&content.top>=s.bottom-1,mapHeight:document.querySelector('.mapwrap').getBoundingClientRect().height};
  });
  assert.equal(result.fits,true,'stats fit '+width);assert.equal(result.noOverlap,true,'no overlap '+width);assert.ok(result.mapHeight>200);
  if(width===390)await page.screenshot({path:'/tmp/viettrip-stats-mobile.png'});
 }
 await page.waitForTimeout(100);hold=true;await page.evaluate(()=>CommunityStats.syncRole());await page.waitForTimeout(100);
 assert.equal(waiting.length,3,'pending aggregate requests are exercised');
 await page.evaluate(()=>{state.isAdmin=false;CommunityStats.syncRole();});
 await Promise.all(waiting.map(finish=>finish()));await page.waitForTimeout(100);
 assert.equal(await page.locator('.communityStats').isVisible(),false,'logout hides every count');
 assert.equal(await page.locator('#totalReviews').textContent(),'—','late response cannot reveal counts after logout');
 hold=false;fail=true;await page.reload();await page.evaluate(()=>{state.isAdmin=true;CommunityStats.syncRole();});await page.waitForTimeout(100);
 assert.equal(await page.locator('#totalVisits').textContent(),'—','failed count is not a fake zero');
 await browser.close();console.log('PASS operator-only statistics: anonymous visit deduplication, no public count requests, login/logout races, exact totals, API failure, desktop/mobile/landscape layout');
})().catch(e=>{console.error(e);process.exit(1)});
