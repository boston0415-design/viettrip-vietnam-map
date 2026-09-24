/* Regression fixtures are entirely local. Never write to production services. */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});
const fixture=String.raw`
const testData={places:Array.from({length:24},(_,i)=>({id:'ux-'+i,name:i===0?'혜택 있는 카페':'주변 업소 '+i,category:'cafe',subcategory:'카페',address:'호치민 테스트 주소 '+i,area:'호치민',lat:10.77+i*.0001,lng:106.7,initialRating:null,memberBenefit:i===0,benefitText:i===0?'숙소 2박 이상 이용 회원 · 예약 시 혜택 확인':'',tags:[],photoUrls:i===0?['https://fixture.invalid/photo1.png','https://fixture.invalid/photo2.png']:[],createdAt:new Date(2026,8,20-i).toISOString()})),reviews:[{id:'review-1',placeId:'ux-0',nickname:'시험 회원',createdBy:'test-device-id',rating:4,recommended:true,text:'사진과 후기를 함께 확인하는 테스트입니다.',photoUrls:['https://fixture.invalid/photo3.png']}]};
db=()=>testData;state.sharedDbLoading=false;state.city='all';state.cat='all';state.sub='all';state.sort='newest';state.query='';state.clickLatLng=null;
const empty=()=>{};
for(const name of ['renderMarkers','refreshRegisteredCoverage','renderPopularAreas','renderGolfCourses','renderPoiMarkers','clearSelectionRanges','clearAreaLabels','clearSelectedSystemIcons','closeSystemInfo','refreshMapAfterMobileLayout','positionSelectedPlaceInView','cancelPendingMapWork','fitCircleGeometry','fitSelectedCityView'])window[name]=empty;
getDeviceId=()=>"test-device-id";isOwnerPlace=()=>false;bootstrapSharedDb=async()=>testData;loadGoogle=async()=>{};restoreAdminSession=async()=>{};
focusLocationAtZoom=async()=>{};
state.map={getCenter:()=>({lat:()=>10.77,lng:()=>106.7}),getZoom:()=>16,setCenter:empty,panBy:empty,setOptions:empty,get:()=>'',getDiv:()=>document.getElementById('map'),addListener:()=>({remove:empty})};
class TestMarker{constructor(o){Object.assign(this,o);}setMap(map){this.map=map;}getMap(){return this.map;}addListener(){return {remove:empty}}}
window.google={maps:{Marker:TestMarker,Circle:TestMarker,Size:class{},Point:class{},event:{trigger:empty},places:{AutocompleteSessionToken:class{},AutocompleteService:class{getPlacePredictions(r,cb){cb([{place_id:'external-ux',structured_formatting:{main_text:'검색한 새 업소',secondary_text:'호치민 주소'}}],'OK')}},PlacesService:class{getDetails(r,cb){cb({place_id:r.placeId,name:r.placeId==='google-wax-a'?'Waxing A':'검색한 새 업소',formatted_address:'정확한 주소',geometry:{location:{lat:()=>10.775,lng:()=>106.705}},types:['cafe'],formatted_phone_number:'+84 123 456 789',opening_hours:{weekday_text:['월요일 09:00–21:00'],isOpen:()=>true},rating:4.5,user_ratings_total:22},'OK')}findPlaceFromQuery(r,cb){cb([],'ZERO_RESULTS')}}}}};
window.aiQuestionCalls=0;window.aiGoogleRequests=[];
window.google.maps.places.Place=class{static async searchByText(request){window.aiGoogleRequests.push(request);if(request.textQuery.includes('Phu My Hung'))return {places:[['g-menu-fish','Google Sashimi',''],['g-menu-bbq','BBQ Grill',''],['g-menu-review','Google 메뉴 후기','사시미를 먹었습니다.'],['g-menu-wrong','노출 금지 해산물','']].map(([id,displayName,review])=>({id,displayName,types:['restaurant','vietnamese_restaurant'],reviews:review?[{text:review,authorAttribution:{displayName:'메뉴 후기 작성자',uri:'https://maps.google.com/reviewer'},googleMapsURI:'https://maps.google.com/review'}]:[],rating:4.8,userRatingCount:55,formattedAddress:'Tân Phong, Quận 7, Hồ Chí Minh',location:{lat:10.72975,lng:106.71302},businessStatus:'OPERATIONAL',attributions:[]}))};if(request.textQuery.includes('Korean'))return {places:[['google-room-known','별실 안내 Google 한식당','korean_restaurant','Private dining rooms available.','2'],['google-room-unknown','룸 정보 없는 Google 한식당','korean_restaurant','','2'],['google-room-no','룸 없는 Google 한식당','korean_restaurant','No private rooms.','2'],['google-room-wrong','노출 금지 Google 베트남','vietnamese_restaurant','Private rooms.','2'],['google-room-d7','노출 금지 Google 7군','korean_restaurant','Private rooms.','7']].map(([id,displayName,type,editorialSummary,district])=>({id,displayName,editorialSummary:id==='google-room-known'?'':editorialSummary,reviews:id==='google-room-known'?[{text:'프라이빗 룸이 있습니다.',authorAttribution:{displayName:'Google 후기 작성자',uri:'https://maps.google.com/reviewer'},googleMapsURI:'https://maps.google.com/review',relativePublishTimeDescription:'한 달 전'}]:[],types:[type,'restaurant'],rating:4.8,userRatingCount:100,formattedAddress:'Quận '+district+', Hồ Chí Minh, Vietnam',location:{lat:10.803,lng:106.732},businessStatus:'OPERATIONAL',currentOpeningHours:{periods:[{open:{day:0,hour:0,minute:0}}]},attributions:[]}))};if(request.textQuery.includes('French'))return {places:[['google-fr-a','French Table','french_restaurant'],['google-fr-b','Maison Test','french_restaurant'],['google-fr-korean','잘못된 한식 Google','korean_restaurant'],['google-fr-viet','잘못된 베트남 Google','vietnamese_restaurant'],['google-fr-unknown','French 제목만 있는 식당','restaurant']].map(([id,displayName,type])=>({id,displayName,types:[type,'restaurant'],rating:4.9,userRatingCount:90,formattedAddress:'Quận 1, Hồ Chí Minh, Vietnam',location:{lat:10.779,lng:106.702},businessStatus:'OPERATIONAL',addressComponents:[{types:['country'],shortText:'VN'}],attributions:[]}))};if(!request.textQuery.includes('waxing'))return {places:[]};return {places:[['google-wax-registered','회원 왁싱샵',4.1,10,'12'],['google-wax-a','Waxing A',4.9,100,'12'],['google-wax-b','Waxing B',4.9,20,'12'],['google-wax-low','낮은 평점',3.8,500,'12'],['google-wax-wrong','다른 군',5,200,'11']].map(([id,displayName,rating,userRatingCount,district])=>({id,displayName,rating,userRatingCount,formattedAddress:'Quận '+district+', Hồ Chí Minh, Vietnam',location:{lat:10.867,lng:106.654},businessStatus:'OPERATIONAL',types:['beauty_salon'],addressComponents:[{types:['country'],shortText:'VN'}],attributions:[]}))};}constructor({id}){this.id=id;}async fetchFields(){const p=testData.places.find(p=>p.googlePlaceId===this.id);if(!p)throw Error('NOT_FOUND');Object.assign(this,{displayName:p.name,formattedAddress:p.address,location:{lat:()=>p.lat,lng:()=>p.lng},businessStatus:'OPERATIONAL',currentOpeningHours:{periods:[{open:{day:0,hour:0,minute:0}}]},attributions:[]});}};
fetch=async(url,options={})=>{if(String(url).includes('/api/ask-map')){window.aiQuestionCalls++;const query=JSON.parse(options.body).query,hanoi=query.includes('하노이'),date=query.includes('여자친구'),french=query.includes('프랑스'),room=query.includes('룸'),fish=query.includes('횟집'),meat=query.includes('고기집');return {ok:true,json:async()=>({intent:{relevant:true,city:hanoi?'hanoi':'hcmc',district:room?'2':query.includes('왁싱')?'12':date?'1':'',area:fish||meat?'푸미흥':'',category:room||french||fish||meat?'restaurant':query.includes('왁싱')?'spa':hanoi?'restaurant':date?'bar':'cafe',subcategory:room?'한식':french?'프랑스':'',features:room?['private_room']:[],terms:fish?['회']:meat?['고기·구이']:query.includes('동태탕')?['동태탕']:query.includes('왁싱')?['왁싱']:[],preferences:date?['date','atmosphere']:[],visitToday:query.includes('오늘'),benefit:/혜택|제휴/.test(query),recommended:query.includes('강추'),nearby:false,unsupported:[]}})}};if(String(url).includes('api.met.no'))return {ok:true,headers:{get:()=>new Date(Date.now()+3600000).toUTCString()},json:async()=>({properties:{timeseries:[{time:new Date(Math.floor(Date.now()/3600000)*3600000).toISOString(),data:{instant:{details:{air_temperature:27}},next_1_hours:{summary:{symbol_code:'cloudy'}}}}]}})};let req;try{req=JSON.parse(options.body)}catch{};const data=req?.p_action==='badges'?[]:{id:'ux-member',nickname:'시험 회원',total:3,level:1,devices:[{hash:'a'.repeat(64),key:'test-device-key'}],counts:{place:1,review:2,correction:0},activities:[],corrections:[]};return {ok:true,json:async()=>data,text:async()=>'',status:200};};
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
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.request().url().includes('fixture.invalid')?route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}):route.fulfill({contentType:'application/json',body:'[]'}));
  if(process.env.OFFLINE_UI){
   const storageShim='<script>(()=>{const memoryStorage=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>memoryStorage.get(k)||null,setItem:(k,v)=>memoryStorage.set(k,String(v)),removeItem:k=>memoryStorage.delete(k)}});Object.defineProperty(window,"sessionStorage",{value:window.localStorage});})();</script>';
   const inline=html.replace('</head>',storageShim+'</head>').replace(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"?]+)[^"]*"[^>]*>/g,(_,file)=>'<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>').replace(/<script[^>]+src="\.\/([^"?]+)[^"]*"[^>]*><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
   await page.setContent(inline,{waitUntil:'load'});
  }else await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
  await page.waitForTimeout(150);
  if(errors.length){await page.screenshot({path:path.join(out,'failure.png')});throw Error('Startup: '+errors.join('; '));}
  async function checkDoubleClick(panelSelector,titleSelector){
   const panel=page.locator(panelSelector),title=page.locator(titleSelector),original=await panel.boundingBox();
   await title.dblclick();const first=await panel.boundingBox();
   if(width<901){assert(Math.abs(first.height-original.height)<2,'mobile double tap retains drag behavior: '+panelSelector);return;}
   await title.dblclick();const second=await panel.boundingBox();
   const larger=first.height>second.height?first:second,smaller=first.height>second.height?second:first;
   assert(larger.height>smaller.height+60,'double click switches maximum/minimum: '+panelSelector+' '+JSON.stringify({first,second}));
   assert(larger.y>=-1&&larger.y+larger.height<=page.viewportSize().height+2,'maximized window stays on screen: '+panelSelector);
   assert(smaller.height>=50,'minimized window remains reachable');
   await title.dblclick();const third=await panel.boundingBox();
   assert(Math.abs(third.height-first.height)<3,'repeated toggles remain consistent: '+panelSelector);
   if(third.height<larger.height-3)await title.dblclick();
  }
  assert.equal(await page.locator('#list article').count(),24);
  assert.equal(await page.locator('.onlineStat').isVisible(),false,'visitor count stays hidden before admin login');
  assert.equal(await page.locator('.communityStats').isVisible(),false,'all statistics are operator-only');
  assert.equal(await page.locator('.top #adminBtn').count(),0,'operator login does not clutter the header');
  assert.equal(await page.locator('.mapwrap [data-browse-filter]').count(),0,'no permanent filter boxes over the map');
  await page.locator('#browseShowList').click();
  assert.equal(await page.locator('[data-browse-filter]').count(),3,'region, category and rating are directly selectable');
  await page.locator('[data-browse-filter="city"]').selectOption('hcmc');
  await page.locator('[data-browse-filter="category"]').selectOption('cafe');
  assert.equal(await page.locator('#list article').count(),24,'quick filters show actual places immediately');
  assert(!(await page.locator('#browseFilterDialog').isVisible()),'quick choices never open a second form');
  await page.locator('.mapWeather').waitFor({state:'visible'});
  assert.equal(await page.locator('.mapWeather').innerText(),'27°');
  const weather=await page.locator('.mapWeather').boundingBox(),map=await page.locator('.mapwrap').boundingBox();
  assert(weather.y+weather.height<=map.y+1,'temperature stays outside the map on both layouts');
  assert.equal(await page.locator('.weatherLayer i').count(),3,'cloud animation stays lightweight');
  await page.locator('.mapWeather').click();assert(await page.locator('#weatherDialog').isVisible());
  await checkDoubleClick('#weatherDialog','#weatherTitle');await page.locator('#weatherClose').click();
  await page.locator('.browseListFilters').click();
  if(width<901)assert((await page.locator('#browseFilterDialog').boundingBox()).width>=width-2,'mobile conditions use the full screen width');
  await page.locator('#browseCategory').selectOption('cafe');
  await page.locator('#browseRating').selectOption('4');
  await page.locator('#browseBenefit').selectOption('benefit');
  assert.equal(await page.locator('#browseApply').innerText(),'1곳 보기');
  await checkDoubleClick('#browseFilterDialog','#browseFilterTitle');
  assert.equal(await page.locator('#browseCategory').inputValue(),'cafe','resizing keeps filter draft');
  await page.locator('#browseFilterClose').click();
  assert.equal(await page.locator('#list article').count(),24,'cancel leaves current map/list unchanged');
  await page.locator('.browseListFilters').click();
  await page.locator('#browseCategory').selectOption('cafe');
  await page.locator('#browseRating').selectOption('4');
  await page.locator('#browseBenefit').selectOption('benefit');
  await page.screenshot({path:path.join(out,`browse-filters-${width}.png`)});
  await page.locator('#browseApply').click();
  assert.equal(await page.locator('#list article').count(),1,'combined conditions apply to real list');
  assert.match(await page.locator('#browseShowList').innerText(),/1곳/);
  await page.locator('#browseClear').click();
  assert.equal(await page.locator('#list article').count(),24,'reset restores all matched places');
  await page.evaluate(()=>{document.getElementById('onlineUsers').textContent='12';document.getElementById('totalVisits').textContent='12,345';document.getElementById('totalPlaces').textContent='999';document.getElementById('totalReviews').textContent='456';});
  if(width<901){
   await page.evaluate(()=>openMobileBusinessList());
  }
  await page.waitForTimeout(280);
  // Mobile opens tall enough to read cards; desktop retains its compact default.
  const sizing=await page.evaluate(()=>({list:document.getElementById('businessSide').getBoundingClientRect().height,content:document.querySelector('.content').getBoundingClientRect().height}));
  assert(sizing.list>50,'list remains operable');
  assert((await page.locator('#businessSide').boundingBox()).y+sizing.list<=page.viewportSize().height+2,'compact list stays in viewport');
  assert(sizing.list/sizing.content<=(width<901?.74:.46),'default list retains visible map space');
  assert(sizing.list/sizing.content>=(width<901?.70:.35),'mobile list opens with room for business information');
  assert.equal(await page.locator('.browseListFilters').evaluate(button=>{const range=document.createRange();range.selectNodeContents(button);return range.getClientRects().length}),1,'filter label stays on one line even at 320px');
  assert.equal(await page.locator('.memberMapKey').count(),0,'decorative map key removed');
  assert.equal(await page.locator('#list .cardBenefit strong').count(),0,'benefit field shows terms without a duplicate heading');
  assert.match(await page.locator('#list .cardBenefit').first().innerText(),/숙소 2박/);
  const tabs=page.locator('.browseListTabs');assert(await tabs.isVisible());
  const tabRect=await tabs.boundingBox(),headRect=await page.locator('#businessSide .mobileSideHead').boundingBox();
  assert(Math.abs(tabRect.y-(headRect.y+headRect.height))<=2,'primary tabs sit immediately under the title');
  for(const value of ['benefit','recommended']){
   await tabs.locator(`[data-benefit-filter="${value}"]`).click();
   assert.equal(await page.locator('#list article').count(),1,'one tap reveals '+value+' businesses');
   assert(!(await page.locator('#browseFilterDialog').isVisible()));
   await tabs.locator(`[data-benefit-filter="${value}"]`).click();assert.equal(await page.locator('#list article').count(),1,'repeated tap retains selected scope');
  }
  await tabs.locator('[data-benefit-filter="all"]').click();assert.equal(await page.locator('#list article').count(),24);
  await page.locator('#mobileFilterToggle').click();
  await page.locator('#businessSide>.menuResizeGrip').focus();await page.keyboard.press('Home');
  await page.locator('#mobileListClose').click();await page.locator('#browseShowList').click();
  const reopened=await page.locator('#businessSide').boundingBox();assert(reopened.height>=sizing.list-2,'list entry restores a usable height after minimizing');
  assert.equal(await page.locator('#mobileFilterToggle').getAttribute('aria-expanded'),'false','list entry shows businesses before secondary options');
  const firstCard=await page.locator('#list article').first().boundingBox();assert(firstCard.y<reopened.y+reopened.height-60,'business content is visible without another drag');
  assert(await tabs.isVisible(),'tabs remain visible after reopening');assert(await page.locator('.mapWeather').isVisible(),'weather stays available with the list open');
  await page.screenshot({path:path.join(out,`compact-list-${width}.png`)});
  await checkDoubleClick('#businessSide','#businessSide .mobileSideHead strong');
  await page.locator('#businessSide').evaluate(n=>{n.classList.remove('menuSized');n.style.removeProperty('--menu-height');n.scrollTop=0;});
  async function dragAt(selector,delta,hold=0){
   const box=await page.locator(selector).first().boundingBox();assert(box,'drag target visible '+selector);
   const x=box.x+Math.min(box.width/2,120),y=Math.max(10,Math.min(page.viewportSize().height-24,box.y+Math.min(box.height/2,18)));
   if(width<901){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-delta*i/8}]});
    if(hold)await page.waitForTimeout(hold);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-delta,{steps:8});if(hold)await page.waitForTimeout(hold);await page.mouse.up();}
   await page.waitForTimeout(300);
  }
  // Names and actual cards, not merely the decorative grip, must expand the LIST.
  for(const selector of ['#businessSide .mobileSideHead strong','#list [data-open-business="ux-0"]']){
   await page.locator('#businessSide').evaluate(n=>{n.classList.remove('menuSized');n.style.removeProperty('--menu-height');n.scrollTop=0;});
   const before=(await page.locator('#businessSide').boundingBox()).height;
   await dragAt(selector,90);
   assert((await page.locator('#businessSide').boundingBox()).height>before+40,'any-area drag expands list: '+selector);
   assert.equal(await page.evaluate(()=>state.selected),null,'dragging name never opens detail');
  }
  await page.locator('#businessSide').evaluate(n=>{n.classList.remove('menuSized');n.style.removeProperty('--menu-height');n.scrollTop=0;});
  await page.locator('#mobileFilterToggle').click();
  assert(await page.locator('#sort').isVisible(),'unique list options remain reachable');
  assert(!await page.locator('#listCity').isVisible(),'duplicate city filter is not displayed');
  assert.equal(await page.locator('#listSharedFilters').count(),0,'duplicate filter entry is removed from options');
  await page.locator('#mobileFilterToggle').click();
  await page.locator('#businessSide').evaluate(n=>n.scrollTop=0);
  const sideBefore=await page.locator('#businessSide').evaluate(n=>({height:n.getBoundingClientRect().height,title:n.querySelector('.mobileSideHead').getBoundingClientRect().top}));
  const sideScrolled=await page.locator('#businessSide').evaluate(n=>{n.scrollTop=125;return {top:n.scrollTop,title:n.querySelector('.mobileSideHead').getBoundingClientRect().top,height:n.getBoundingClientRect().height};});
  assert(sideScrolled.top>=120,'only the outer list panel scrolls');
  assert(Math.abs(sideBefore.title-sideScrolled.title)<1,'list control bar stays anchored while content scrolls');
  assert.equal(sideBefore.height,sideScrolled.height,'content scrolling does not resize list');
  const pinnedTabs=await tabs.boundingBox(),pinnedHead=await page.locator('#businessSide .mobileSideHead').boundingBox();assert(Math.abs(pinnedTabs.y-(pinnedHead.y+pinnedHead.height))<=2,'tabs stay pinned below the title when scrolling');
  assert.equal(await page.locator('#list').evaluate(n=>getComputedStyle(n).overflowY),'visible');
  async function assertAnchored(panelSelector,headerSelector,gripSelector){
   const geometry=await page.locator(panelSelector).evaluate((p,{headerSelector,gripSelector})=>{
    const h=p.querySelector(headerSelector),g=p.querySelector(gripSelector),saved=p.scrollTop;
    const result=[0,50,125,400,100000].map(scroll=>{p.scrollTop=scroll;
     const pr=p.getBoundingClientRect(),hr=h.getBoundingClientRect(),gr=g.getBoundingClientRect();
     const control=h.querySelector('button:last-child'),cr=control.getBoundingClientRect();
     return {scroll:p.scrollTop,header:hr.top-pr.top,grip:gr.top-pr.top,gap:hr.top-gr.bottom,
       visible:cr.top>=pr.top&&cr.bottom<=pr.bottom,topmost:control.contains(document.elementFromPoint(cr.x+cr.width/2,cr.y+cr.height/2))};
    });p.scrollTop=saved;return result;
   },{headerSelector,gripSelector});
   assert(geometry.some(r=>r.scroll>100),'fixture has genuinely scrolled content');
   for(const r of geometry){
    assert(Math.abs(r.header-geometry[0].header)<1,'header fixed at scroll '+r.scroll);
    assert(Math.abs(r.grip-geometry[0].grip)<1,'grip fixed at scroll '+r.scroll);
    assert(r.gap>=-1,'grip never overlaps header');
    assert(r.visible&&r.topmost,'close/options stay visible and reachable');
   }
  }
  await assertAnchored('#businessSide','.mobileSideHead','.menuResizeGrip');
  // One resize gesture stays a resize even after reaching the upper limit.
  await page.locator('#businessSide').evaluate(n=>n.scrollTop=0);
  await page.locator('#businessSide>.menuResizeGrip').press('End');
  await page.locator('#businessSide>.menuResizeGrip').press('ArrowDown');
  await page.locator('#businessSide').evaluate(n=>n.scrollTop=40);
  await dragAt('#list [data-open-business="ux-0"]',120);
  assert.equal(await page.locator('#businessSide').evaluate(n=>n.scrollTop),40,'expanding past the upper limit does not scroll cards or add scroll inertia');
  await page.locator('#businessSide').evaluate(n=>n.scrollTop=0);
  const fullList=await page.locator('#businessSide').boundingBox();
  const listContainer=await page.locator('.content').boundingBox();
  assert(Math.abs(fullList.y-listContainer.y-14)<=2,'list can be raised close to the map top');
  const anchoredTitle=await page.locator('#businessSide>.mobileSideHead').boundingBox();
  await dragAt('#businessSide .mobileSideHead strong',55);
  assert(Math.abs((await page.locator('#businessSide').boundingBox()).height-fullList.height)<1,'expanded list stops at its upper limit');
  assert(Math.abs((await page.locator('#businessSide>.mobileSideHead').boundingBox()).y-anchoredTitle.y)<1,'title drag at the limit never pushes controls upward');
  assert(await page.locator('#businessSide .mobileSideHead strong').evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.left+8,r.top+8))}),'map toolbar never covers the raised list title');
  assert.equal(await page.locator('#businessSide').evaluate(n=>n.scrollTop),0,'title gestures only resize, never scroll cards');
  await dragAt('#list [data-open-business="ux-0"]',55);
  assert(await page.locator('#businessSide').evaluate(n=>n.scrollTop>20),'a new gesture on cards scrolls the fully expanded list');
  await assertAnchored('#businessSide','.mobileSideHead','.menuResizeGrip');
  await page.screenshot({path:path.join(out,`pinned-list-${width}.png`)});
  await page.locator('#mobileFilterToggle').click();
  assert(await page.locator('#businessSide').evaluate(n=>n.classList.contains('mobileFiltersOpen')),'options still respond after scrolling');
  await page.locator('#mobileFilterToggle').click();
  await dragAt('#businessSide .mobileSideHead strong',-90,180);
  const loweredList=await page.locator('#businessSide').boundingBox();
  assert(Math.abs(loweredList.height-(fullList.height-90))<2,'sticky title keeps the chosen height after release: '+JSON.stringify({width,fullList,loweredList}));
  await assertAnchored('#businessSide','.mobileSideHead','.menuResizeGrip');
  await page.locator('#mobileListClose').click();
  if(width<901)await page.locator('#browseShowList').click();
  else await page.locator('#desktopListToggle').click();
  await assertAnchored('#businessSide','.mobileSideHead','.menuResizeGrip');
  await page.locator('#businessSide').evaluate(n=>n.scrollTop=0);
  await page.locator('#list [data-open-business="ux-0"]').click();
  assert(await page.locator('#detail').evaluate(n=>n.classList.contains('show')));
  assert(await page.locator('.browseNavigation').isVisible(),'list selection retains navigation');
  await page.locator('[data-browse-next]').click();assert.equal(await page.evaluate(()=>state.selected),'ux-1');
  await page.locator('[data-browse-prev]').click();assert.equal(await page.evaluate(()=>state.selected),'ux-0');
  // Photo tap opens a separate layer and never collapses the place panel.
  await page.evaluate(()=>setDetailExpanded(true));
  const readingPanel=await page.locator('#detail').boundingBox(),readingMap=await page.locator('.mapwrap').boundingBox();
  assert(readingPanel.y<=readingMap.y+readingMap.height*.23,'expanded detail uses the upper reading space on both layouts');
  const heading=await page.locator('#detail .detailHeader').boundingBox(),closeButton=await page.locator('#detailCloseBtn').boundingBox();
  assert(heading.y+heading.height-readingPanel.y<=90,'short business title leaves a compact anchored header');
  assert(closeButton.width>=44&&closeButton.height>=44,'compact header retains a usable close target');
  const detailBefore=await page.locator('#detail').evaluate(n=>({height:n.getBoundingClientRect().height,title:n.querySelector('.detailHeader').getBoundingClientRect().top}));
  const detailAfter=await page.locator('#detail').evaluate(n=>{n.scrollTop=100;return {height:n.getBoundingClientRect().height,title:n.querySelector('.detailHeader').getBoundingClientRect().top,top:n.scrollTop};});
  assert(detailAfter.top>=95,'detail panel itself scrolls');
  assert(Math.abs(detailBefore.title-detailAfter.title)<1,'detail title and close stay anchored while content scrolls');
  assert.equal(detailBefore.height,detailAfter.height,'detail native scroll keeps panel height');
  assert.equal(await page.locator('#detailBody').evaluate(n=>getComputedStyle(n).overflowY),'visible');
  await assertAnchored('#detail','.detailHeader','.detailResizeHandle');
  await page.locator('#detail').evaluate(n=>n.scrollTop=0);
  // Exercise real browser input, not only programmatic scrollTop assignments.
  const titleRect=await page.locator('#detail .detailHeader').boundingBox();
  if(width<901){
    const cdp=await context.newCDPSession(page),x=Math.round(titleRect.x+18),y=Math.round(titleRect.y+12);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*12}]});await page.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{
    await page.mouse.move(titleRect.x+18,titleRect.y+12);await page.mouse.wheel(0,100);
  }
  await page.waitForTimeout(200);
  if(width<901)assert(await page.locator('#detail').evaluate(n=>n.getBoundingClientRect().height)>detailBefore.height,'touch starting on business title expands the whole panel');
  else assert(await page.locator('#detail').evaluate(n=>n.scrollTop>30),'desktop wheel continues scrolling');
  await assertAnchored('#detail','.detailHeader','.detailResizeHandle');
  await page.screenshot({path:path.join(out,`pinned-detail-${width}.png`)});
  await page.locator('#detail>.detailResizeHandle').press('End');
  const tallestDetail=await page.locator('#detail').boundingBox();
  assert(Math.abs(tallestDetail.y-readingMap.y-14)<=2,'maximized detail reaches just below the map top');
  await assertAnchored('#detail','.detailHeader','.detailResizeHandle');
  assert(await page.locator('#detail .detailName').evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.left+8,r.top+8))}),'map controls never cover the maximized business title');
  await page.screenshot({path:path.join(out,`detail-reading-space-${width}.png`)});
  await page.locator('#detail').evaluate(n=>n.scrollTop=0);
  await dragAt('.placePhotos img',-65);
  assert(!await page.locator('#memberPhotoViewer').evaluate(n=>n.open),'photo DRAG does not open the viewer');
  await checkDoubleClick('#detail','#detail .detailHeader h2');
  await page.locator('.placePhotos a').first().click();
  assert(await page.locator('#memberPhotoViewer').evaluate(n=>n.open));
  assert.equal(await page.evaluate(()=>state.selected),'ux-0');
  await checkDoubleClick('#memberPhotoViewer','#memberPhotoCount');
  await page.locator('#memberPhotoNext').click();assert.match(await page.locator('#memberPhotoCount').innerText(),/2 \/ 2/);
  await page.locator('#memberPhotoClose').click();
  assert(await page.locator('#detailBody').isVisible());
  await page.locator('#detailCloseBtn').click();
  if(width<901)assert(await page.locator('#businessSide').evaluate(n=>n.classList.contains('mobileOpen')),'X restores original business list');
  assert.match(await page.locator('#list .cardBenefit').first().innerText(),/숙소 2박/);
  // List scroll position survives opening and closing a business further down.
  const scroll=await page.locator('#businessSide').evaluate(n=>{n.scrollTop=300;return n.scrollTop;});
  assert(scroll>0,'restore test uses the actual outer scroll container');
  await page.evaluate(()=>MapUX.openBusiness('ux-4','list'));
  await page.locator('#detailCloseBtn').click();
  assert.equal(await page.locator('#businessSide').evaluate(n=>n.scrollTop),scroll,'whole-list scroll restored');
  if(width<901)await page.evaluate(()=>closeMobileBusinessList());
  // Each nearby origin gives the same informative cards and seamless detail navigation.
  for(const kind of ['current','stay','manual']){
   await page.evaluate(kind=>{state.nearby={lat:10.77,lng:106.7,name:kind==='stay'?'내 숙소':'현재 위치',kind,radius:1000};state.city='all';state.sort='distance';state.selected=null;closeMobileBusinessList();if(!isMobileMapLayout()&&!document.querySelector('.content').classList.contains('desktopListCollapsed'))document.getElementById('desktopListToggle').click();renderAll();},kind);
   assert(await page.locator('#nearbyResults').isVisible());
   assert.match(await page.locator('#nearbyResultCards').innerText(),/회원 평가|직선/);
   assert.match(await page.locator('#nearbyResultCards').innerText(),/숙소 2박/);
   const nearbyHeight=await page.locator('#nearbyResults').evaluate(n=>n.getBoundingClientRect().height);
   assert(nearbyHeight<=96,'nearby defaults to a vertically small tray');
   const criteria=await page.evaluate(()=>JSON.stringify([state.nearby,state.city,state.cat,state.sub,state.query,state.benefitFilter,state.sort]));
   await page.locator('#nearbyCollapse').click();
   assert(!await page.locator('#nearbyResultsBody').isVisible());
   assert(await page.locator('#nearbyResults').evaluate(n=>n.getBoundingClientRect().height<=54));
   await page.evaluate(()=>renderAll());
   assert(!await page.locator('#nearbyResultsBody').isVisible(),'rerender does not undo collapse');
   if(kind==='stay')await page.screenshot({path:path.join(out,`nearby-collapsed-${width}.png`)});
   await page.locator('#nearbyClose').click();
   assert(!await page.locator('#nearbyResults').isVisible());
   assert(await page.locator('#nearbyReopen').isVisible(),'small reopen action remains accessible');
   await page.evaluate(()=>renderAll());
   assert(!await page.locator('#nearbyResults').isVisible(),'rerender does not reopen a dismissed tray');
   assert.equal(await page.evaluate(()=>JSON.stringify([state.nearby,state.city,state.cat,state.sub,state.query,state.benefitFilter,state.sort])),criteria,'collapse/close never clears origin, pins or filters');
   await page.locator('#nearbyReopen').click();
   assert(await page.locator('#nearbyResultsBody').isVisible());
   const grip=await page.locator('#nearbyResizeGrip').boundingBox();
   if(width<901){
    const cdp=await context.newCDPSession(page),x=Math.round(grip.x+grip.width/2),y=Math.round(grip.y+grip.height/2);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+65}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   }else{await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2+65,{steps:8});await page.mouse.up();}
   assert(!await page.locator('#nearbyResultsBody').isVisible(),'drag down folds nearby results');
   await page.locator('#nearbyCollapse').click();
   assert(await page.locator('#nearbyResultsBody').isVisible());
   const smallNearby=(await page.locator('#nearbyResults').boundingBox()).height;
   await dragAt('#nearbyResultCards .nearbyResultCard',65);
   assert((await page.locator('#nearbyResults').boundingBox()).height>smallNearby+30,'swipe on nearby business card expands panel instead of opening it');
   assert.equal(await page.evaluate(()=>state.selected),null);
   await dragAt('#nearbyResultsTitle',-150);
   assert(!await page.locator('#nearbyResultsBody').isVisible(),'nearby TITLE also folds panel');
   await page.locator('#nearbyCollapse').click();
   if(kind==='stay')await page.screenshot({path:path.join(out,`nearby-${width}.png`)});
   if(kind==='manual')await checkDoubleClick('#nearbyResults','#nearbyResultsTitle');
   await page.locator('[data-nearby-business="ux-0"]').click();
   await page.locator('[data-browse-next]').click();
   await page.locator('#detailCloseBtn').click();
   assert(await page.locator('#nearbyResults').isVisible(),'close restores nearby cards');
  }
  // Review editor has a visible close and a large viewport; closing is not saving.
  await page.evaluate(()=>{state.selected='ux-0';renderDetail();openReview();});
  assert(await page.locator('#reviewEditorClose').isVisible(),'review has explicit close');
  const reviewBox=await page.locator('#reviewModal .modal').boundingBox();
  assert(reviewBox.height>=Math.min(820,page.viewportSize().height*.86),'larger review editing area');
  assert.equal(await page.locator('#reviewModal .menuResizeGrip').count(),0,'writing is not intercepted by resizing');
  await page.locator('#rText').fill('취소할 임시 문장');
  await checkDoubleClick('#reviewModal .modal','#reviewEditorTitle');
  assert.equal(await page.locator('#rText').inputValue(),'취소할 임시 문장','resizing preserves review draft');
  const editingHeight=(await page.locator('#reviewModal .modal').boundingBox()).height;
  await page.locator('#rText').dblclick();assert.equal((await page.locator('#reviewModal .modal').boundingBox()).height,editingHeight,'text selection never resizes editor');
  await page.screenshot({path:path.join(out,`review-editor-${width}.png`)});
  await page.locator('#reviewEditorClose').click();
  assert.equal(await page.evaluate(()=>testData.reviews[0].text),'사진과 후기를 함께 확인하는 테스트입니다.','close does not change saved text');
  // Save explicitly targets the editor's business even when a map callback selects another place.
  await page.evaluate(()=>{
   openReview();window.__savedFunctions={supaRpc,uploadSelectedReviewPhotos,fetchSharedDb,saveDb};
   window.__writes=[];supaRpc=async(name,args)=>{window.__writes.push({name,args});return 'review-1';};
   uploadSelectedReviewPhotos=()=>new Promise(resolve=>window.__finishUpload=resolve);
   fetchSharedDb=async()=>testData;saveDb=()=>{};
   window.__savePromise=saveReview();state.selected='ux-1';
   closeModalById('reviewModal');
  });
  assert(await page.locator('#reviewModal').evaluate(n=>n.classList.contains('open')),'busy save cannot be dismissed and reset');
  await page.evaluate(()=>{window.__finishUpload(['https://fixture.invalid/photo3.png']);return window.__savePromise;});
  assert.equal(await page.evaluate(()=>window.__writes[0].args.p_place_id),'ux-0','save cannot overwrite another selected business');
  assert.equal(await page.evaluate(()=>window.__writes[0].args.p_body),'사진과 후기를 함께 확인하는 테스트입니다.');
  await page.evaluate(()=>{({supaRpc,uploadSelectedReviewPhotos,fetchSharedDb,saveDb}=window.__savedFunctions);closeDetailPanel();});
  // Admin is a role, never an ordinary rank; native scrolling does not resize membership.
  await page.evaluate(()=>{state.isAdmin=true;syncAdminButton();});
  assert.equal(await page.locator('#openMapMembership').isVisible(),false,'operator banner stays out of the header');
  assert(await page.locator('.communityStats').isVisible(),'operator can see dashboard counts');
  await page.locator('#browseShowList').click();await page.locator('#mobileFilterToggle').click();
  await page.locator('#openOperatorTools').click();
  assert.equal(await page.locator('#memberHeroRank').innerText(),'관리자');
  assert.equal(await page.locator('#memberDialog .menuResizeGrip').count(),0);
  assert(!await page.locator('#memberGradeSection').isVisible());
  const before=await page.locator('#memberDialog').evaluate(n=>n.getBoundingClientRect().height);
  await page.locator('#memberDialog').evaluate(n=>n.scrollTop=180);
  assert.equal(await page.locator('#memberDialog').evaluate(n=>n.getBoundingClientRect().height),before);
  await page.locator('#memberDialog').evaluate(n=>n.scrollTop=0);
  await checkDoubleClick('#memberDialog','#memberTitle');
  await page.locator('#memberClose').click();
  await page.evaluate(()=>{state.isAdmin=false;syncAdminButton();});
  assert.equal(await page.locator('.communityStats').isVisible(),false,'logout removes dashboard counts');
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
  await checkDoubleClick('#placeModal .modal','#placeModal h3');
  assert.equal(await page.locator('#pName').inputValue(),'검색한 새 업소','resizing preserves registration draft');
  await page.evaluate(()=>closeModalById('placeModal'));
  // Failed lookup still offers a manual form, without assigning the map center as location.
  await page.locator('#searchInput').fill('직접 등록할 업소');
  await page.locator('#searchRegisterManually').click();
  assert.equal(await page.locator('#pName').inputValue(),'직접 등록할 업소');
  assert.equal(await page.evaluate(()=>state.clickLatLng),null);
  await page.evaluate(()=>closeModalById('placeModal'));
  await page.evaluate(()=>{closeDetailPanel();renderAll();});
  if(width>900){
   await page.evaluate(()=>setMobileLegendExpanded(true));
   await checkDoubleClick('#areaLegend','#areaLegendTitle');
   await page.locator('#openAreaDirectory').click();
   await checkDoubleClick('#areaPanel','#areaPanelTitle');await page.locator('#areaPanelClose').click();
   await page.evaluate(()=>setMobileLegendExpanded(false));
  }
  // AI keeps member contributions first and adds attributed Google discoveries.
  await page.evaluate(()=>document.activeElement?.blur());
  await page.waitForTimeout(180); // Compare resting styles after the focus transition.
  const searchBox=await page.locator('.top .search').boundingBox(),aiBox=await page.locator('.aiComposer').boundingBox();
  assert(aiBox.y>=searchBox.y+searchBox.height,'AI composer sits below the existing search');
  assert(aiBox.x>=0&&aiBox.x+aiBox.width<=width+1,'composer fits the viewport');
  assert.equal(aiBox.height,44,'slim composer retains usable height');
  assert(Math.abs(searchBox.width-aiBox.width)<1&&Math.abs(searchBox.height-aiBox.height)<1,'both search boxes use identical dimensions');
  const geometry=await page.evaluate(()=>['.top .search','.aiComposer'].map(selector=>{const css=getComputedStyle(document.querySelector(selector));return [css.borderRadius,css.backgroundColor,css.borderColor].join('|')}));
  assert.equal(geometry[0],geometry[1],'both search boxes share shape and color');
  await page.locator('#aiMapQuestion').focus();
  assert(await page.locator('#aiMapExamples').isVisible());
  const sampleCalls=await page.evaluate(()=>window.aiQuestionCalls);
  if(width<901)await page.locator('#aiMapExamples button').first().tap();else await page.locator('#aiMapExamples button').first().click();
  assert.equal(await page.evaluate(()=>window.aiQuestionCalls),sampleCalls+1,'sample tap submits immediately');
  assert.match(await page.locator('#aiMapQuestion').inputValue(),/여자친구.*분위기 좋은 바/);
  await page.locator('#aiMapQuestion').fill('호치민 혜택 있는 카페 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiResult').waitFor();
  assert.equal(await page.locator('.aiResult').count(),1,'AI conditions search real fixture records');
  assert.equal(await page.locator('#aiMapExamples').isVisible(),false,'examples do not cover results');
  assert.match(await page.locator('.aiResult').innerText(),/혜택 있는 카페/);
  assert.equal(await page.locator('.aiResult .aiBenefit').count(),1,'actual benefit has its own badge');
  assert.equal(await page.locator('.aiResult .aiRecommended').count(),1,'actual recommendation has its own badge');
  await page.screenshot({path:path.join(out,`ai-search-${width}.png`)});
  if(width<901)await page.locator('.aiResult').tap();else await page.locator('.aiResult').click();
  assert.equal(await page.locator('#aiMapPanel').isVisible(),false);
  assert.match(await page.locator('#detail').innerText(),/혜택 있는 카페/);
  await page.waitForTimeout(300);
  assert(await page.locator('#detail').isVisible(),'selected detail does not disappear');
  await page.evaluate(()=>closeDetailPanel());
  await page.evaluate(()=>{testData.places.push(...Array.from({length:12},(_,i)=>({id:'ai-hanoi-'+i,name:'하노이 등록 식당 '+i,category:'restaurant',subcategory:'베트남',area:'하노이',address:'Hà Nội, Việt Nam',lat:21.03,lng:105.84,initialRating:i%2?5:4,memberBenefit:i===0,benefitText:i===0?'회원 음료 혜택':'',tags:[]})),{id:'ai-bar-mood',googlePlaceId:'google-mood',name:'데이트 바',category:'bar',subcategory:'루프탑 바',area:'호치민',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,description:'분위기가 좋고 데이트하기 좋아요',initialRating:4},{id:'ai-bar-plain',googlePlaceId:'google-plain',name:'테스트 일반 바',category:'bar',subcategory:'펍',area:'호치민',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:5});});
  await page.locator('#aiMapQuestion').fill('하노이에서 회원들이 강추한 식당 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#aiMapStatus').textContent.includes('모든 조건'));
  assert.equal(await page.locator('.aiResult').count(),0,'explicit endorsement request never falls back to unendorsed places');
  assert.equal(await page.locator('#aiGoogleSection').count(),0,'Google cannot prove member endorsements');
  await page.locator('#aiMapQuestion').fill('하노이 식당 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiResult').first().waitFor();
  assert.equal(await page.locator('.aiResult').count(),12,'generic restaurant request still lists all matching places');
  assert.match(await page.locator('#aiMapTitle').innerText(),/추천.*12곳/);
  assert.equal(await page.locator('.aiResult .aiRecommended').count(),0,'alternatives cannot acquire fake 강추 badges');
  assert.equal(await page.locator('.aiResult .aiBenefit').count(),1);
  await page.screenshot({path:path.join(out,`ai-fallback-${width}.png`)});
  const aiHeaderY=(await page.locator('.aiPanelHead').boundingBox()).y;
  await page.locator('.aiResult').last().scrollIntoViewIfNeeded();
  assert(Math.abs((await page.locator('.aiPanelHead').boundingBox()).y-aiHeaderY)<2,'result title and close stay anchored when scrolling');
  await page.locator('.aiResult').last().click();
  assert.match(await page.locator('#detail').innerText(),/하노이 등록 식당/);
  await page.evaluate(()=>closeDetailPanel());
  await page.locator('#aiMapQuestion').fill('오늘 여자친구와 갈만한 1군에서 분위기 좋은 바를 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiResult').first().waitFor();
  assert.equal(await page.locator('.aiResult').count(),2,'atmosphere preferences rank instead of blocking results');
  assert.match(await page.locator('.aiResult').first().innerText(),/데이트 바/);
  assert.match(await page.locator('#aiMapStatus').innerText(),/오늘 영업시간을 확인/);
  await page.waitForFunction(()=>document.querySelectorAll('.aiHours-open').length===2);
  assert.match(await page.locator('.aiHours').first().innerText(),/지금 영업 중[\s\S]*24시간[\s\S]*Google Maps/);
  await page.screenshot({path:path.join(out,`ai-hours-${width}.png`)});
  if(width<901)await page.locator('#aiMapClear').tap();else await page.locator('#aiMapClear').click();
  assert.equal(await page.locator('#aiMapQuestion').inputValue(),'');
  assert.equal(await page.locator('#aiMapClear').isVisible(),false);
  assert.equal(await page.locator('.aiResult').count(),0);
  assert(await page.locator('#aiMapExamples').isVisible());
  await page.locator('#aiMapQuestion').fill('12군 왁싱샵 추천해줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiGoogleResult').first().waitFor();
  assert.equal(await page.locator('.aiMemberResult').count(),0,'Google discovery works with zero member matches');
  assert.equal(await page.locator('.aiGoogleResult').count(),3,'exclude low ratings and other districts');
  assert.match(await page.locator('.aiGoogleResult').first().innerText(),/Waxing A[\s\S]*Google ★ 4.9[\s\S]*100개/);
  assert.equal(await page.locator('.aiGoogleResult .aiRecommended,.aiGoogleResult .aiBenefit').count(),0,'never invent member benefits for Google discoveries');
  if(width<901)await page.locator('.aiGoogleResult').first().tap();else await page.locator('.aiGoogleResult').first().click();
  await page.waitForFunction(()=>document.querySelector('#detail').textContent.includes('Waxing A'));
  assert.equal(await page.locator('#aiMapPanel').isVisible(),false,'one tap opens the external detail');
  await page.waitForTimeout(200);assert(await page.locator('#detail').isVisible(),'external details remain open');
  await page.evaluate(()=>{closeDetailPanel();testData.places.push({id:'wax-member',googlePlaceId:'google-wax-registered',name:'회원 왁싱샵',category:'spa',subcategory:'스파',address:'Quận 12, Hồ Chí Minh, Vietnam',area:'호치민',lat:10.867,lng:106.654,initialRating:4});});
  await page.locator('#aiMapQuestion').focus();
  await page.locator('#aiMapQuestion').fill('12군 왁싱샵 추천해주세요');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiGoogleResult').first().waitFor();
  assert.equal(await page.locator('.aiMemberResult').count(),1);
  assert.equal(await page.locator('.aiGoogleResult').count(),2,'same Google place is not repeated');
  assert.match(await page.locator('.aiResult').first().innerText(),/회원 왁싱샵[\s\S]*회원 등록/);
  const colors=await page.evaluate(()=>['.aiMemberResult','.aiGoogleResult'].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor));
  assert.notEqual(colors[0],colors[1],'member results have a distinct subtle tint');
  await page.screenshot({path:path.join(out,`ai-google-${width}.png`)});
  await page.evaluate(()=>{testData.places.push(...[['fr-local','프랑스 등록 식당','프랑스',false],['fr-benefit','프랑스 강추 제휴','프랑스',true],['fr-wrong-k','노출 금지 한식 강추 제휴','한식',true],['fr-wrong-v','노출 금지 베트남 강추 제휴','베트남',true]].map(([id,name,subcategory,promoted])=>({id,name,category:'restaurant',subcategory,area:'호치민',address:'Quận 1, Hồ Chí Minh, Vietnam',lat:10.779,lng:106.702,description:'조용한 식당',initialRating:promoted?5:4,memberBenefit:promoted,tags:promoted?['강추업소']:[]})));});
  await page.locator('#aiMapQuestion').fill('여자친구와 갈만한 조용한 프랑스 식당 추천해줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('.aiGoogleResult').first().waitFor();
  assert.equal(await page.locator('.aiMemberResult').count(),2,'only French member restaurants qualify');
  assert.equal(await page.locator('.aiGoogleResult').count(),2,'French Google type is checked after text search');
  assert(!(await page.locator('#aiMapResults').innerText()).includes('노출 금지'));
  assert(!(await page.locator('#aiMapResults').innerText()).includes('잘못된'));
  assert.match(await page.locator('#aiMapStatus').innerText(),/프랑스/);
  assert.equal(await page.locator('.aiMemberResult .aiRecommended').count(),1,'endorsement remains visible for eligible French restaurants');
  assert.equal(await page.locator('.aiMemberResult .aiBenefit').count(),1);
  const request=await page.evaluate(()=>window.aiGoogleRequests.at(-1));assert.equal(request.includedType,'french_restaurant');assert.equal(request.useStrictTypeFiltering,true);
  await page.screenshot({path:path.join(out,`ai-french-${width}.png`)});
  const googleCalls=await page.evaluate(()=>window.aiGoogleRequests.length);
  await page.locator('#aiMapQuestion').fill('회원 강추 제휴 프랑스 식당 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.waitForFunction(()=>document.querySelector('.aiMemberResult')?.textContent.includes('프랑스 강추 제휴'));
  assert.equal(await page.locator('.aiResult').count(),1,'all requested conditions are intersected');
  assert.equal(await page.evaluate(()=>window.aiGoogleRequests.length),googleCalls,'no external request for unverified community benefits');
  await page.locator('#aiMapQuestion').fill('프랑스 식당에서 동태탕 먹을 곳 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.waitForFunction(()=>document.querySelector('.aiGoogleStatus')?.textContent.includes('찾지 못'));
  assert.equal(await page.locator('.aiResult').count(),0,'no cuisine or menu fallback when no exact match exists');
  await page.evaluate(()=>{testData.places.push(...[
   {id:'room-known',name:'별실 안내 회원 한식당',description:'별실 완비',memberBenefit:true,tags:['강추업소']},
   {id:'room-unknown',name:'룸 정보 없는 회원 한식당',description:'한식 메뉴',memberBenefit:true,tags:['강추업소']},
   {id:'room-no',name:'노출 금지 룸 없는 식당',description:'룸이 없습니다'},
   {id:'room-wrong',name:'노출 금지 베트남 룸 식당',description:'별실 완비',subcategory:'베트남'}
  ].map(p=>({category:'restaurant',subcategory:'한식',address:'Quận 2, Hồ Chí Minh, Vietnam',area:'호치민',lat:10.803,lng:106.732,initialRating:4,...p})));});
  await page.locator('#aiMapQuestion').fill('오늘 2군에서 여자친구와 갈건데 룸이 있는 한식당 추천해');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.locator('#aiGoogleRoomUnknown .aiResult').first().waitFor();
  assert.equal(await page.locator('.aiMemberResult').count(),2);
  assert.equal(await page.locator('.aiGoogleResult').count(),2);
  assert.match(await page.locator('.aiRoomCredit').innerText(),/Google 후기 작성자/);
  assert.match(await page.locator('#aiMapTitle').innerText(),/룸 안내 2곳 · 문의 필요 2곳/);
  assert.equal(await page.locator('#aiRoomUnknownSection .aiResult').count(),2);
  assert.equal(await page.locator('#aiRoomUnknownSection .aiBenefit,#aiRoomUnknownSection .aiRecommended').count(),0);
  assert.equal(await page.locator('.aiMemberResult .aiBenefit').count(),1,'only verified room is promoted');
  assert.match(await page.locator('.aiResult').nth(1).innerText(),/별실 안내 Google/,'verified room precedes inquiry leads regardless of source');
  assert(!(await page.locator('#aiMapResults').innerText()).includes('노출 금지'));
  const roomBounds=await page.locator('#aiMapPanel').boundingBox();assert(roomBounds.x>=-1&&roomBounds.x+roomBounds.width<=width+1,'room groups fit mobile and desktop');
  await page.screenshot({path:path.join(out,`ai-room-${width}.png`)});
  const candidate=page.locator('[data-place-id="room-unknown"]');
  if(width<901)await candidate.tap();else await candidate.click();
  assert.match(await page.locator('#detail').innerText(),/룸 정보 없는 회원 한식당/,'inquiry lead opens detail in one tap');
  assert.equal(await page.locator('#aiMapPanel').isVisible(),false);
  await page.evaluate(()=>closeDetailPanel());
  await page.evaluate(()=>testData.places.push(...[
   {id:'menu-hang',name:'행님아',tags:['해산물','초밥·회','강추업소'],memberBenefit:true},
   {id:'menu-bbq',name:'등록 BBQ',tags:['고기·구이']},
   {id:'menu-wrong',name:'노출 금지 회식 업소',tags:['해산물','강추업소'],memberBenefit:true}
  ].map(p=>({category:'restaurant',subcategory:'한식',address:'Phú Mỹ Hưng, Hồ Chí Minh',lat:10.72975,lng:106.71302,initialRating:4,...p}))));
  await page.locator('#aiMapQuestion').fill('푸미흥에서 맛있는 고기집 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#aiMapTitle').textContent==='추천 업소 · 2곳');
  assert.equal(await page.locator('.aiMemberResult').count(),1);assert.equal(await page.locator('.aiGoogleResult').count(),1);
  assert.match(await page.locator('.aiMemberResult').innerText(),/등록 BBQ/);
  await page.locator('#aiMapQuestion').fill('푸미흥에서 횟집 찾아줘');
  await page.locator('#aiMapQuestion').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#aiMapTitle').textContent==='추천 업소 · 3곳');
  assert.equal(await page.locator('.aiMemberResult').count(),1);assert.equal(await page.locator('.aiGoogleResult').count(),2);
  assert.match(await page.locator('.aiResult').first().innerText(),/행님아/);
  assert.equal(await page.locator('.aiRecommended').count(),1);assert.equal(await page.locator('.aiBenefit').count(),1);
  assert.match(await page.locator('.aiRoomCredit').innerText(),/메뉴 후기 작성자/);
  assert(!(await page.locator('#aiMapResults').innerText()).includes('노출 금지'));
  await page.screenshot({path:path.join(out,`ai-menu-${width}.png`)});
  const hang=page.locator('[data-place-id="menu-hang"]');if(width<901)await hang.tap();else await hang.click();
  assert.match(await page.locator('#detail').innerText(),/행님아/);
  assert.equal(await page.locator('#aiMapPanel').isVisible(),false);
  await page.evaluate(()=>closeDetailPanel());
  if(width<901)await page.locator('#searchClear').tap();else await page.locator('#searchClear').click();
  assert.equal(await page.locator('#searchInput').inputValue(),'');
  assert.equal(await page.locator('#placeSearchResults').isVisible(),false);
  await page.screenshot({path:path.join(out,`overview-${width}.png`)});
  assert.deepEqual(errors,[],`no runtime error at ${width}px`);
  results.push({width,passed:true,checks:['matching search design, date preferences, strict cuisine and benefit eligibility, verified-room and inquiry groups, raw fish and BBQ menu discovery independent of cuisine, truthful badges and stable detail','list-only quick filters','no public dashboard counts','operator controls in list options','desktop double-click max/min and mobile drag preservation','readable list under half height','expand-first title drag with anchored header and grip','nearby collapse/close/reopen','drag-to-collapse','title to detail','previous/next','photo drag versus tap','review close and frozen save target','photo modal','list/nearby restoration','benefit text','membership height','search registration','manual location validation']});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'map-ux-results.json'),JSON.stringify(results,null,2));console.log('PASS Map UX browser regression',JSON.stringify(results));
 }catch(error){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});}throw error;}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
