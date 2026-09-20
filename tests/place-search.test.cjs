const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
for(const width of [390,768,1440]){
 const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const run=code=>vm.runInContext(code,dom.getInternalVMContext());w.assert=assert;
 w.matchMedia=q=>({matches:q.includes('max-width')?width<=900:false});w.requestAnimationFrame=()=>0;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 let timerId=0;const timers=new Map();w.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId};w.clearTimeout=id=>timers.delete(id);
 const debounce=()=>{for(const [id,t] of timers)if(t.delay===350){timers.delete(id);t.fn()}};
 const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 const input=d.getElementById('searchInput'),list=d.getElementById('placeSearchList'),panel=d.getElementById('detail');
 const type=q=>{input.value=q;input.dispatchEvent(new w.Event('input',{bubbles:true}))};
 for(const file of fs.readdirSync('assets/js').filter(f=>/^0[1-8]-/.test(f)).sort())run(read('assets/js/'+file));
 run(read('assets/js/place-photos.js'));
 run(`
 const fixture={places:[{id:'local',name:'한인 카페',category:'cafe',subcategory:'카페',address:'184 Trần Hưng Đạo, Hồ Chí Minh',lat:10.77,lng:106.7,initialRating:4},{id:'branch',name:'한인 카페 2호점',category:'cafe',subcategory:'카페',address:'하노이',lat:21.02,lng:105.85}],reviews:[]};
 db=()=>fixture;const no=()=>{};
 renderList=no;renderMarkers=no;refreshRegisteredCoverage=no;renderCityControls=no;renderAreaList=no;renderPopularAreas=no;renderCats=no;renderHierarchyNav=no;renderRatingFilterState=no;clearSelectionRanges=no;clearAreaLabels=no;clearSelectedSystemIcons=no;closeAreaPanel=no;closeSystemInfo=no;setMobileLegendExpanded=no;closeMobileBusinessList=no;refreshMapAfterMobileLayout=no;isOwnerPlace=()=>false;
 let cameraCalls=0,photoCalls=0;focusLocationAtZoom=async()=>{cameraCalls++};
 const predictions=[],details=[],finds=[];
 class Marker{constructor(o){Object.assign(this,o);this.listeners={}}setMap(m){this.map=m}addListener(n,f){this.listeners[n]=f}}
 google={maps:{Marker,places:{AutocompleteSessionToken:class{},AutocompleteService:class{getPlacePredictions(r,cb){predictions.push({r,cb})}},PlacesService:class{getDetails(r,cb){details.push({r,cb})}findPlaceFromQuery(r,cb){finds.push({r,cb})}}}}};
 state.map={getCenter:()=>({lat:()=>10.77,lng:()=>106.7})};
 const raw=(id,name='NJ184 Vietnam Head Spa')=>({place_id:id,name,formatted_address:'184 Trần Hưng Đạo',geometry:{location:{lat:()=>10.761,lng:()=>106.686}},rating:4.8,user_ratings_total:2372,formatted_phone_number:'+84 708 999 184',website:'https://example.com/',opening_hours:{weekday_text:['월요일 10:00–22:00'],isOpen:()=>true},photos:[{getUrl(){photoCalls++;return 'https://example.com/photo.jpg'},html_attributions:['<a href="https://example.com/author">작가</a>']}],types:['spa'],html_attributions:[]});
 `);
 run(read('assets/js/place-search.js'));w.PlaceSearch.init();
 assert.equal(w.PlaceSearch.localMatches('한인 카페')[0].id,'local','Korean normalization');
 assert.equal(w.PlaceSearch.localMatches('tran hung dao')[0].id,'local','accent-insensitive address lookup');
 type('nj');type('nj18');type('nj184');assert.equal(run('predictions.length'),0,'debounce before API');debounce();assert.equal(run('predictions.length'),1);
 assert.equal(run('predictions[0].r.componentRestrictions.country'),'vn');assert(run('predictions[0].r.sessionToken'));
 const session=run('predictions[0].r.sessionToken');
 run(`predictions[0].cb([{place_id:'nj184',structured_formatting:{main_text:'NJ184 Vietnam Head Spa',secondary_text:'184 Trần Hưng Đạo'}}],'OK')`);await tick();
 assert.equal(list.children.length,1);assert(list.textContent.includes('184 Trần'));
 list.firstElementChild.click();assert(panel.classList.contains('show'));assert(panel.textContent.includes('불러오는 중'));
 assert.equal(run('details.length'),1);assert.equal(run('details[0].r.sessionToken'),session);
 assert(!run('details[0].r.fields').includes('ALL'));
 run(`details[0].cb(raw('nj184'),'OK')`);await tick();
 assert(panel.classList.contains('show'));assert(panel.textContent.includes('영업 중'));assert(panel.textContent.includes('Google 후기 2,372'));
 assert(panel.querySelector('a[href="tel:+84708999184"]'));assert.equal(run('photoCalls'),1);
 const photos=panel.querySelector('#externalPhotos img');
 for(let i=0;i<4;i++)run('renderAll()');assert(panel.classList.contains('show'),'DB/filter refresh never dismisses Google detail');assert.equal(panel.querySelector('#externalPhotos img'),photos);assert.equal(run('photoCalls'),1);
 assert.equal(run('cameraCalls'),1);
 // User dismissal / another selection must win over delayed Google responses.
 const pending=w.PlaceSearch.openGoogle({placeId:'other',name:'다른 장소'});run('closeDetailPanel()');run(`details[1].cb(raw('other'),'OK')`);await pending;
 assert(!panel.classList.contains('show'));assert.equal(w.PlaceSearch.currentPlace(),null);
 const a=w.PlaceSearch.openGoogle({placeId:'old',name:'오래된 장소'}),b=w.PlaceSearch.openGoogle({placeId:'new',name:'새 장소'});
 run(`details[3].cb(raw('new','새 장소'),'OK')`);await b;run(`details[2].cb(raw('old','오래된 장소'),'OK')`);await a;
 assert(panel.textContent.includes('새 장소'));assert(!panel.textContent.includes('오래된 장소'));
 // A member selection crosses city/filter scope and uses member reviews, not a fake Google record.
 await w.PlaceSearch.openMember('local');assert.equal(run('state.selected'),'local');assert.equal(w.PlaceSearch.currentPlace(),null);assert(!panel.classList.contains('externalDetail'));assert(panel.textContent.includes('우리 회원 평균'));assert.equal(d.getElementById('detailBody').hidden,false);
 assert.equal(run('fixture.places.length'),2,'Google results are never inserted into DB');
 // Late autocomplete cannot replace current text or reopen a dismissed menu.
 type('old query');debounce();type('new query');debounce();
 run(`predictions.at(-1).cb([{place_id:'new-query',description:'new query'}],'OK')`);await tick();
 run(`predictions.at(-2).cb([{place_id:'old-query',description:'old query'}],'OK')`);await tick();assert(list.textContent.includes('new query'));assert(!list.textContent.includes('old query'));
 type('pending query');debounce();w.PlaceSearch.dismiss();run(`predictions.at(-1).cb([{place_id:'pending',description:'pending'}],'OK')`);await tick();assert(d.getElementById('placeSearchResults').hidden);
 // IME composition and keyboard navigation.
 input.dispatchEvent(new w.Event('compositionstart'));const before=run('predictions.length');type('한');debounce();assert.equal(run('predictions.length'),before);
 input.dispatchEvent(new w.Event('compositionend'));type('한인 카페');assert.equal(list.children.length,2);
 input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(input.getAttribute('aria-activedescendant'),'placeSuggestion0');
 input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await tick();assert.equal(run('state.selected'),'local');
 // Failure retains the selected name/address and provides an explicit retry, with no duplicates.
 const failed=w.PlaceSearch.openGoogle({placeId:'failed',name:'실패 업소',address:'주소'});run(`details.at(-1).cb(null,'REQUEST_DENIED')`);await failed;
 assert(panel.classList.contains('show'));assert(panel.textContent.includes('실패 업소'));assert(d.getElementById('retryPlaceDetails'));
 const num=run('details.length');d.getElementById('retryPlaceDetails').click();assert.equal(run('details.length'),num+1);
 run(`details.at(-1).cb(raw('failed'),'OK')`);await tick();assert(!d.getElementById('retryPlaceDetails'));
 // External HTML cannot create executable markup or unsafe links.
 const unsafe=w.PlaceSearch.openGoogle({placeId:'unsafe',name:'<img src=x onerror=alert(1)>'});assert(!panel.querySelector('img[onerror]'));
 run(`details.at(-1).cb({...raw('unsafe','<img src=x onerror=alert(1)>'),website:'javascript:alert(1)',photos:[],html_attributions:['<script>alert(1)</script><a href="javascript:alert(1)">bad</a>']},'OK')`);await unsafe;
 assert(!panel.querySelector('script'));assert(!panel.querySelector('[href^="javascript:"]'));assert(!panel.querySelector('[onerror]'));
 dom.window.close();
}
console.log('PASS 390/768/1440 search: Korean/Vietnamese normalization, debounce/session, member/Google selection, persistent details, stale responses/dismissal, IME/keyboard, scoped filters, photo reuse, retry and untrusted fields');
})().catch(error=>{console.error(error);process.exitCode=1});
