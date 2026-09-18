const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,run=code=>vm.runInContext(code,dom.getInternalVMContext());
w.assert=assert;w.matchMedia=()=>({matches:false});
for(const match of read('index.html').matchAll(/<script src="\.\/(assets\/js\/(?:0[1-8]-[^?]+|hospital-directory\.js))\?/g))run(read(match[1]));
(async()=>{
 await run(`(async()=>{
  let fixture={places:[],reviews:[]},writes=[];
  db=()=>fixture;saveDb=data=>{fixture=data};
  supaInsert=async(table,row)=>{assert.equal(table,'places');writes.push(row)};
  fetchSharedDb=async()=>({places:writes.map(row=>remotePlaceToLocal(row)),reviews:[]});
  uploadSelectedPlacePhotos=async()=>[];
  initAddressAutocomplete=()=>{};renderAll=()=>{};renderCityControls=()=>{};renderPopularAreas=()=>{};
  focusLocationAtZoom=async()=>{};selectPlace=()=>{};refreshMapAfterMobileLayout=()=>{};
  window.alert=message=>{throw Error('Unexpected alert: '+message)};
  fillAdmin();
  assert([...$('#pCat').options].some(o=>o.value==='hospital'&&o.text==='병원'),'hospital must be in the actual registration select');
  $('#pCat').onchange=fillSubs;$('#pCat').value='hospital';$('#pCat').dispatchEvent(new Event('change'));
  assert.equal($('#pSubLabel').textContent,'진료과');
  assert.equal($('#pSub').options.length,13);
  assert($('#restaurantTagField').classList.contains('hiddenField'));
  for(const specialty of HOSPITAL_SPECIALTIES){
    openPlace({name:'등록 테스트 '+specialty,category:'hospital',subcategory:specialty,address:'Ho Chi Minh City',latLng:{lat:10.77,lng:106.7}});
    $('#pNickname').value='테스트회원';
    assert.equal($('#pCat').value,'hospital');assert.equal($('#pSub').value,specialty);
    await savePlaceOnce();
    assert.equal(writes.at(-1).category,'hospital');assert.equal(writes.at(-1).subcategory,specialty);
    assert(fixture.places.some(p=>p.category==='hospital'&&p.subcategory===specialty),'public reload retains the specialty');
  }
  assert.equal(writes.length,13);
  const dermatology=fixture.places.find(p=>p.subcategory==='피부과');
  openEditPlace(dermatology,'owner');assert.equal($('#pCat').value,'hospital');assert.equal($('#pSub').value,'피부과');
  assert.deepEqual(inferCategory('Clinic',['doctor']),['hospital','종합병원·일반진료']);
  assert.deepEqual(inferCategory('Vet',['veterinary_care']),['hospital','동물병원']);
  assert.deepEqual(inferCategory('Dental',['dentist']),['hospital','치과']);
  assert.deepEqual(inferCategory('Cafe',['cafe']),['cafe','카페']);
  setPlaceCategory('restaurant','한식');assert.equal($('#pSubLabel').textContent,'나라별 음식');
  assert(!$('#restaurantTagField').classList.contains('hiddenField'),'switching back preserves restaurant controls');

  const extra={...dermatology,id:'hanoi-member',name:'다른 도시 병원',cityKey:'hanoi',area:'하노이',address:'Hanoi, Vietnam',lat:21.03,lng:105.85};
  fixture.places.push(extra);
  state.city='hcmc';state.navCategory='hospital';state.cat='all';state.sub='all';state.selectedNavItem=null;
  for(const specialty of ['피부과','정형외과','동물병원']){
    state.hospitalSpecialty=specialty;renderHierarchyNav();renderList();
    assert.equal(items().length,1);assert.equal(items()[0].subcategory,specialty);
    assert($('#list').textContent.includes('등록 테스트 '+specialty));
    assert(!$('#list').textContent.includes('다른 도시 병원'));
    assert($('#tagNav').textContent.includes('등록 테스트 '+specialty));
    assert.equal(registeredHospitals().length,1);
  }
  state.hospitalSpecialty='피부과';
  const markers=[],covered=[],fitted=[];
  google={maps:{Size:class{},Point:class{},Marker:class{
    constructor(options){this.options=options;markers.push(this)}setMap(){}addListener(){}
  }}};
  bindMapFeatureInfo=()=>{};state.map={};renderMarkers();assert.equal(markers.length,1);assert.equal(markers[0]._placeId,dermatology.id);
  resolvePoiLocationPromise=async()=>null;closeSystemInfo=()=>{};clearSelectionRanges=()=>{state.selectionOverlays=[]};
  clearAreaLabels=()=>{};clearSelectedSystemIcons=()=>{};
  makeBounds=()=>({});extendBoundsByCircle=(bounds,location)=>fitted.push(location);
  addSelectionCircle=(loc,radius,color,a,b,p)=>{covered.push(p.id);const circle={setMap(){}};state.selectionOverlays.push(circle);return circle};
  fitUnifiedBounds=()=>{};
  await showPointSet([],'병원');
  assert.deepEqual(covered,[dermatology.id],'a registered hospital gets coverage even without built-in POIs');
  assert.equal(fitted.length,1);assert.equal(fitted[0].lat,10.77);
  state.hospitalSpecialty='all';assert.equal(items().length,13);
  state.city='hanoi';state.hospitalSpecialty='피부과';assert.deepEqual(items().map(p=>p.id),['hanoi-member']);
 })()`);
 dom.window.close();
 console.log('PASS actual registration dropdown, all 13 specialty save/reload paths, edit prefill, restaurant controls, city/specialty lists, markers and registered-only map bounds');
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1});
