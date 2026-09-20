/* Regression fixtures are entirely local. Never write to production services. */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});
const fixture=String.raw`
const testData={places:Array.from({length:24},(_,i)=>({id:'ux-'+i,name:i===0?'혜택 있는 카페':'주변 업소 '+i,category:'cafe',subcategory:'카페',address:'호치민 테스트 주소 '+i,area:'호치민',lat:10.77+i*.0001,lng:106.7,initialRating:null,memberBenefit:i===0,benefitText:i===0?'숙소 2박 이상 이용 회원 · 예약 시 혜택 확인':'',tags:[],photoUrls:i===0?['https://fixture.invalid/photo1.png','https://fixture.invalid/photo2.png']:[],createdAt:new Date(2026,8,20-i).toISOString()})),reviews:[{id:'review-1',placeId:'ux-0',nickname:'시험 회원',rating:4,text:'사진과 후기를 함께 확인하는 테스트입니다.',photoUrls:['https://fixture.invalid/photo3.png']}]};
db=()=>testData;state.sharedDbLoading=false;state.city='all';state.cat='all';state.sub='all';state.sort='newest';state.query='';state.clickLatLng=null;
const empty=()=>{};
for(const name of ['renderMarkers','refreshRegisteredCoverage','renderPopularAreas','renderGolfCourses','renderPoiMarkers','clearSelectionRanges','clearAreaLabels','clearSelectedSystemIcons','closeSystemInfo','refreshMapAfterMobileLayout','positionSelectedPlaceInView','cancelPendingMapWork','fitCircleGeometry','fitSelectedCityView'])window[name]=empty;
getDeviceId=()=>"test-device-id";isOwnerPlace=()=>false;bootstrapSharedDb=async()=>testData;loadGoogle=async()=>{};restoreAdminSession=async()=>{};bindAreaNavigation=empty;
focusLocationAtZoom=async()=>{};
state.map={getCenter:()=>({lat:()=>10.77,lng:()=>106.7}),getZoom:()=>16,setCenter:empty,panBy:empty,setOptions:empty,get:()=>'',getDiv:()=>document.getElementById('map'),addListener:()=>({remove:empty})};
class TestMarker{constructor(o){Object.assign(this,o);}setMap(map){this.map=map;}getMap(){return this.map;}addListener(){return {remove:empty}}}
window.google={maps:{Marker:TestMarker,Circle:TestMarker,Size:class{},Point:class{},event:{trigger:empty},places:{AutocompleteSessionToken:class{},AutocompleteService:class{getPlacePredictions(r,cb){cb([{place_id:'external-ux',structured_formatting:{main_text:'검색한 새 업소',secondary_text:'호치민 주소'}}],'OK')}},PlacesService:class{getDetails(r,cb){cb({place_id:r.placeId,name:'검색한 새 업소',formatted_address:'정확한 주소',geometry:{location:{lat:()=>10.775,lng:()=>106.705}},types:['cafe'],formatted_phone_number:'+84 123 456 789',opening_hours:{weekday_text:['월요일 09:00–21:00'],isOpen:()=>true},rating:4.5,user_ratings_total:22},'OK')}findPlaceFromQuery(r,cb){cb([],'ZERO_RESULTS')}}}}};
fetch=async(url,options={})=>{let req;try{req=JSON.parse(options.body)}catch{};const data=req?.p_action==='badges'?[]:{id:'ux-member',nickname:'시험 회원',total:3,level:1,devices:[{hash:'a'.repeat(64),key:'test-device-key'}],counts:{place:1,review:2,correction:0},activities:[],corrections:[]};return {ok:true,json:async()=>data,text:async()=>'',status:200};};
`;
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const html=source.replace(/<script[^>]+src="[^"]*(?:online-presence|realtime-|community-stats|10-runtime-guard|home-screen|guide-map-link|transport-guide|business-share|admin-regions)[^"]*"[^>]*><\/script>/g,'').replace(/(<script src="\.\/assets\/js\/09-init-events[^>]*>)/,`<script>${fixture}</script>$1`);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let file=path.join(root,decodeURIComponent(url.pathname));
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;res.end();return;}
 const ext=path.extname(file);res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff'})[ext]||'text/plain');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const results=[];
 try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},isMobile:width<901,hasTouch:width<901});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.request().url().includes('fixture.invalid')?route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}):route.fulfill({contentType:'application/json',body:'[]'}));
  if(process.env.OFFLINE_UI){
   const storageShim='<script>(()=>{const memoryStorage=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>memoryStorage.get(k)||null,setItem:(k,v)=>memoryStorage.set(k,String(v)),removeItem:k=>memoryStorage.delete(k)}});Object.defineProperty(window,"sessionStorage",{value:window.localStorage});})();</script>';
   const inline=html.replace('</head>',storageShim+'</head>').replace(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"?]+)[^"]*"[^>]*>/g,(_,file)=>'<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>').replace(/<script[^>]+src="\.\/([^"?]+)[^"]*"[^>]*><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
   await page.setContent(inline,{waitUntil:'load'});
  }else await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
  await page.waitForTimeout(150);
  if(errors.length){await page.screenshot({path:path.join(out,'failure.png')});throw Error('Startup: '+errors.join('; '));}
  assert.equal(await page.locator('#list article').count(),24);
  await page.evaluate(()=>{document.getElementById('onlineUsers').textContent='12';document.getElementById('totalVisits').textContent='12,345';document.getElementById('totalPlaces').textContent='999';document.getElementById('totalReviews').textContent='456';});
  if(width<901){
   const rects=await page.locator('.communityStats').evaluate(n=>[...n.children].map(c=>{const r=c.getBoundingClientRect();return {y:r.y,h:r.height}}));
   assert(rects.every(r=>Math.abs(r.y-rects[0].y)<2),'mobile statistics stay in one row');
   assert(rects[0].h<=30,'statistics are compact');
   await page.evaluate(()=>openMobileBusinessList());
  }
  await page.locator('#list [data-open-business="ux-0"]').click();
  assert(await page.locator('#detail').evaluate(n=>n.classList.contains('show')));
  assert(await page.locator('.browseNavigation').isVisible(),'list selection retains navigation');
  await page.locator('[data-browse-next]').click();assert.equal(await page.evaluate(()=>state.selected),'ux-1');
  await page.locator('[data-browse-prev]').click();assert.equal(await page.evaluate(()=>state.selected),'ux-0');
  // Photo tap opens a separate layer and never collapses the place panel.
  await page.evaluate(()=>setDetailExpanded(true));
  await page.locator('.placePhotos a').first().click();
  assert(await page.locator('#memberPhotoViewer').evaluate(n=>n.open));
  assert.equal(await page.evaluate(()=>state.selected),'ux-0');
  await page.locator('#memberPhotoNext').click();assert.match(await page.locator('#memberPhotoCount').innerText(),/2 \/ 2/);
  await page.locator('#memberPhotoClose').click();
  assert(await page.locator('#detailBody').isVisible());
  await page.locator('#detailCloseBtn').click();
  if(width<901)assert(await page.locator('#businessSide').evaluate(n=>n.classList.contains('mobileOpen')),'X restores original business list');
  assert.match(await page.locator('#list .cardBenefit').first().innerText(),/숙소 2박/);
  // List scroll position survives opening and closing a business further down.
  const scroll=await page.locator('#list').evaluate(n=>{n.scrollTop=300;return n.scrollTop;});
  await page.evaluate(()=>MapUX.openBusiness('ux-4','list'));
  await page.locator('#detailCloseBtn').click();
  assert.equal(await page.locator('#list').evaluate(n=>n.scrollTop),scroll,'list scroll restored');
  if(width<901)await page.evaluate(()=>closeMobileBusinessList());
  // Each nearby origin gives the same informative cards and seamless detail navigation.
  for(const kind of ['current','stay','manual']){
   await page.evaluate(kind=>{state.nearby={lat:10.77,lng:106.7,name:kind==='stay'?'내 숙소':'현재 위치',kind,radius:1000};state.city='all';state.sort='distance';state.selected=null;renderAll();},kind);
   assert(await page.locator('#nearbyResults').isVisible());
   assert.match(await page.locator('#nearbyResultCards').innerText(),/회원 평가|직선/);
   assert.match(await page.locator('#nearbyResultCards').innerText(),/숙소 2박/);
   if(kind==='stay')await page.screenshot({path:path.join(out,`nearby-${width}.png`)});
   await page.locator('[data-nearby-business="ux-0"]').click();
   await page.locator('[data-browse-next]').click();
   await page.locator('#detailCloseBtn').click();
   assert(await page.locator('#nearbyResults').isVisible(),'close restores nearby cards');
  }
  // Admin is a role, never an ordinary rank; native scrolling does not resize membership.
  await page.evaluate(()=>{state.isAdmin=true;syncAdminButton();});
  assert.equal(await page.locator('#memberBarRank').innerText(),'관리자');
  await page.locator('#openMapMembership').click();
  assert.equal(await page.locator('#memberHeroRank').innerText(),'관리자');
  assert.equal(await page.locator('#memberDialog .menuResizeGrip').count(),0);
  assert(!await page.locator('#memberGradeSection').isVisible());
  const before=await page.locator('#memberDialog').evaluate(n=>n.getBoundingClientRect().height);
  await page.locator('#memberDialog').evaluate(n=>n.scrollTop=180);
  assert.equal(await page.locator('#memberDialog').evaluate(n=>n.getBoundingClientRect().height),before);
  await page.locator('#memberClose').click();
  await page.evaluate(()=>{state.isAdmin=false;syncAdminButton();});
  assert.match(await page.locator('#memberBarRank').innerText(),/이등병/,await page.locator('#memberStatus').innerText());
  // Global search works even with nearby active; registration CTA remains outside scroll body.
  await page.locator('#searchInput').fill('검색한 새 업소');
  await page.waitForTimeout(420);
  await page.locator('.placeSearchOption').first().click();
  assert(await page.locator('#registerSearchPlace').isVisible());
  assert.equal(await page.locator('#detailBody #registerSearchPlace').count(),0);
  await page.screenshot({path:path.join(out,`search-${width}.png`)});
  await page.locator('#registerSearchPlace').click();
  assert(await page.locator('#placeModal').evaluate(n=>n.classList.contains('open')));
  assert.equal(await page.locator('#pName').inputValue(),'검색한 새 업소');
  await page.evaluate(()=>closeModalById('placeModal'));
  // Failed lookup still offers a manual form, without assigning the map center as location.
  await page.locator('#searchInput').fill('직접 등록할 업소');
  await page.locator('#searchRegisterManually').click();
  assert.equal(await page.locator('#pName').inputValue(),'직접 등록할 업소');
  assert.equal(await page.evaluate(()=>state.clickLatLng),null);
  await page.evaluate(()=>closeModalById('placeModal'));
  await page.evaluate(()=>{closeDetailPanel();renderAll();});
  await page.screenshot({path:path.join(out,`overview-${width}.png`)});
  assert.deepEqual(errors,[],`no runtime error at ${width}px`);
  results.push({width,passed:true,checks:['one-row stats','title to detail','previous/next','photo modal','list/nearby restoration','benefit text','admin role','membership height','search registration','manual location validation']});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'map-ux-results.json'),JSON.stringify(results,null,2));console.log('PASS Map UX browser regression',JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
