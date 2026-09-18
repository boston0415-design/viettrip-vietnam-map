const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
w.assert=assert;w.matchMedia=()=>({matches:false});
for(const m of read('index.html').matchAll(/<script src="\.\/(assets\/js\/(?:0[1-8]-[^?]+|(?:hospital|pharmacy)-directory\.js))\?/g))run(read(m[1]));
(async()=>{
 await run(`(async()=>{
  const symbolCases=[['cafe','과일·주스','nutrition'],['shopping','과일가게','nutrition'],['cafe','베이커리','bakery_dining'],['cafe','디저트','cake'],['cafe','카페','local_cafe'],['hospital','동물병원','pets'],['hospital','치과','dentistry'],['hospital','내과','local_hospital'],['pharmacy','약국','local_pharmacy'],['stay','레지던스','apartment']];
  google={maps:{Size:class{},Point:class{}}};
  for(const [category,sub,key] of symbolCases){
   assert.equal(businessSymbolKey(category,sub),key);
   assert(businessGlyph(category,sub).includes(MAP_SYMBOL_PATHS[key]));
   assert(decodeURIComponent(businessMarkerIcon(category,sub).url).includes(MAP_SYMBOL_PATHS[key]));
  }
  for(const [category,cfg] of Object.entries(CONFIG.categories))for(const sub of cfg.subs)assert(MAP_SYMBOL_PATHS[businessSymbolKey(category,sub)],category+sub);
  assert(decodeURIComponent(poiSvg('병원','🐾').url).includes(MAP_SYMBOL_PATHS.pets));
  assert(decodeURIComponent(poiSvg('약국','✚').url).includes(MAP_SYMBOL_PATHS.local_pharmacy));
  for(const [name,types,expected] of [
   ['Tony Fruit - Fruits & Juice',['cafe','food'],['cafe','과일·주스']],
   ['Artisan Bakery',['bakery','restaurant'],['cafe','베이커리']],
   ['Fruit Hotel',['lodging'],['stay','호텔']],['Lotte Supermarket',['supermarket'],['shopping','마트']],
   ['Pharmacy',['pharmacy','store'],['pharmacy','약국']],['Park',['park'],['attraction','공원']]
  ])assert.deepEqual(inferCategory(name,types),expected);
  let fixture={places:[],reviews:[]},writes=[];
  db=()=>fixture;saveDb=data=>{fixture=data};supaInsert=async(table,row)=>{writes.push(row)};
  fetchSharedDb=async()=>({places:writes.map(remotePlaceToLocal),reviews:[]});uploadSelectedPlacePhotos=async()=>[];
  initAddressAutocomplete=()=>{};renderAll=()=>{};renderCityControls=()=>{};renderPopularAreas=()=>{};
  focusLocationAtZoom=async()=>{};selectPlace=()=>{};refreshMapAfterMobileLayout=()=>{};
  window.alert=m=>{throw Error(m)};
  fillAdmin();assert([...$('#pCat').options].some(o=>o.value==='pharmacy'&&o.text==='약국'));
  openPlace({name:'회원 약국',category:'pharmacy',subcategory:'약국',address:'Ho Chi Minh City',latLng:{lat:10.77,lng:106.7}});
  $('#pNickname').value='테스트회원';await savePlaceOnce();assert.equal(writes[0].category,'pharmacy');assert.equal(writes[0].subcategory,'약국');
  const member=fixture.places[0];openEditPlace(member,'owner');assert.equal($('#pCat').value,'pharmacy');assert.equal($('#pSub').value,'약국');
  fixture.places.push({...member,id:'other-city',cityKey:'hanoi',area:'하노이',address:'Hanoi, Vietnam',lat:21.03,lng:105.85});
  state.city='hcmc';state.navCategory='pharmacy';state.areaType='약국';state.cat='all';state.sub='all';state.selectedNavItem=null;
  renderHierarchyNav();renderList();renderAreaList();
  assert.equal(PHARMACY_DIRECTORY.length,7);
  assert.equal(currentPoints().filter(p=>p.type==='약국').length,4);
  assert.equal($('#subNav').querySelectorAll('[data-nav-point]').length,4);
  assert.equal($('#subNav').querySelectorAll('[data-member-point]').length,1);
  assert($('#areaList').textContent.includes('72 Tân Mỹ'));assert(!$('#areaList').textContent.includes('86 Trần Bình'));
  assert.deepEqual(items().map(p=>p.id),[member.id]);assert($('#list').textContent.includes('회원 약국'));
  assert.equal(matchesNavigationScope({...member,category:'hospital'}),false);
  let selected=null;selectPlace=id=>{selected=id};$('#subNav').querySelector('[data-member-point]').click();assert.equal(selected,member.id);
  const covered=[],fitted=[],markers=[];
  state.map={};resolvePoiLocationPromise=async()=>null;closeSystemInfo=()=>{};
  clearSelectionRanges=()=>{state.selectionOverlays=[]};clearAreaLabels=()=>{};clearSelectedSystemIcons=()=>{};
  makeBounds=()=>({});extendBoundsByCircle=(b,loc)=>fitted.push(loc);fitUnifiedBounds=()=>{};
  addSelectionCircle=(loc,r,c,a,b,p)=>{covered.push(p.id);const circle={setMap(){}};state.selectionOverlays.push(circle);return circle};
  await showPointSet([],'약국');assert.deepEqual(covered,[member.id]);assert.equal(fitted.length,1);
  google.maps.Marker=class{constructor(o){markers.push(o)}setMap(){}addListener(){}};bindMapFeatureInfo=()=>{};
  renderMarkers();assert.equal(markers.length,1);assert(decodeURIComponent(markers[0].icon.url).includes(MAP_SYMBOL_PATHS.local_pharmacy));
  state.city='hanoi';renderHierarchyNav();assert.equal($('#subNav').querySelectorAll('[data-nav-point]').length,3);
  assert.deepEqual(items().map(p=>p.id),['other-city']);
  state.city='muine';renderHierarchyNav();assert($('#subNav').textContent.includes('등록된 약국이 없습니다'));
  for(const p of PHARMACY_DIRECTORY){assert.equal(new URL(p.sourceUrl).hostname,'nhathuoclongchau.com.vn');assert(p.address);assert(mapFeatureHtml(p).includes('약국 공식 지점 안내'))}
 })()`);
 console.log('PASS category icons, automatic classification, pharmacy registration/edit, 7 official branches, city-filtered navigation/list/markers, registered-only coverage');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
