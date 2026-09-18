const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,run=code=>vm.runInContext(code,dom.getInternalVMContext());
w.assert=assert;w.matchMedia=()=>({matches:true});
for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(name=>/^0[1-8]-/.test(name)).sort())run(read('assets/js/'+name));

(async()=>{
 await run(`(async()=>{
  let fixture={places:[],reviews:[]},writes=[],uploads=0,patches=[];
  db=()=>fixture;saveDb=data=>{fixture=data};
  supaInsert=async(table,row)=>{writes.push({table,row})};
  fetchSharedDb=async()=>({places:writes.map(({row})=>remotePlaceToLocal({...row,owner_key_hash:state.deviceHash})),reviews:[]});
  uploadSelectedPlacePhotos=async()=>{uploads++;return []};
  initAddressAutocomplete=()=>{};renderAll=()=>{};renderList=()=>{};
  renderCityControls=()=>{};renderAreaList=()=>{};renderPopularAreas=()=>{};renderHierarchyNav=()=>{};
  focusLocationAtZoom=async()=>{};selectPlace=()=>{};refreshMapAfterMobileLayout=()=>{};positionSelectedPlaceInView=()=>{};
  window.alert=message=>{throw Error('Unexpected validation alert: '+message)};
  state.deviceHash='my-device-hash';
  assert(validRegistrantNickname('  여행자  '));assert(validRegistrantNickname('가'.repeat(30)));
  for(const bad of ['', '  ', '가'.repeat(31), 'a\\nb', 'a\\u0000b'])assert(!validRegistrantNickname(bad));
  assert.equal(remotePlaceToLocal({}).registrantNickname,'','legacy rows do not acquire a fictitious nickname');
  assert.equal(placeToRemote({}).registrant_nickname,null,'legacy pending uploads remain compatible');
  const form=$('#pNickname');
  assert.equal(form.autocomplete,'nickname');assert.equal(form.maxLength,30);
  openPlace({name:'테스트 식당',latLng:{lat:10.77,lng:106.7},address:'테스트 주소',category:'restaurant',subcategory:'한식'});
  assert(form.required);assert(!form.readOnly);assert.equal(form.value,'');
  for(const bad of ['', '   ', '가'.repeat(31)]){
    form.value=bad;await savePlaceOnce();
    assert.equal(writes.length,0);assert.equal(uploads,0,'invalid nickname stops before uploads or network writes');
    assert.equal(form.getAttribute('aria-invalid'),'true');assert.equal(document.activeElement,form);
    assert($('#placeModal').classList.contains('open'),'invalid entry preserves the registration draft');
    assert.equal($('#pName').value,'테스트 식당');
  }
  form.value='  카페회원  ';await savePlaceOnce();
  assert.equal(writes.length,1);assert.equal(writes[0].table,'places');
  assert.equal(writes[0].row.registrant_nickname,'카페회원');
  assert.equal(fixture.places[0].registrantNickname,'카페회원','nickname survives public reload');
  assert.equal(writes[0].row.created_by,getDeviceId(),'device credential is unchanged');
  assert(!$('#placeModal').classList.contains('open'));

  const place=fixture.places[0];state.selected=place.id;renderDetail();
  assert.equal($('#detail .placeRegistrant').textContent,'등록자 카페회원');
  assert($('#detailBody').hidden,'registration attribution does not enlarge the compact mobile sheet');
  assert($('#editPlaceBtn'),'owner retains edit access');
  place.ownerKeyHash='someone-else';renderDetail();
  assert(!$('#editPlaceBtn'),'same displayed nickname does not grant ownership');
  assert(!$('#adminDeleteBtn'));
  place.registrantNickname='<img src=x onerror=alert(1)>';renderDetail();
  assert.equal($('#detail .placeRegistrant span').textContent,place.registrantNickname);
  assert(!$('#detail .placeRegistrant img'),'public nickname must be escaped');

  place.registrantNickname='원래 등록자';place.ownerKeyHash=state.deviceHash;
  for(const mode of ['owner','admin']){
    state.isAdmin=mode==='admin';openEditPlace(place,mode);
    assert(form.readOnly);assert(!form.required);assert.equal(form.value,'원래 등록자');
    // A manipulated read-only input cannot rewrite attribution through the edit payload.
    form.value='다른 닉네임';
    updateExistingPlaceWithFallback=async(id,current,patch)=>{patches.push(patch);return {ok:true}};
    fetchSharedDb=async()=>fixture;
    await savePlaceOnce();
    assert(!Object.hasOwn(patches.at(-1),'registrant_nickname'));
    assert.equal(place.registrantNickname,'원래 등록자');
  }
  place.registrantNickname='';state.isAdmin=false;openEditPlace(place,'owner');
  assert.equal(form.value,'');assert(!form.required);assert(form.readOnly);
  await savePlaceOnce();assert.equal(place.registrantNickname,'','legacy edits work without fabricated attribution');
  renderDetail();assert(!$('#detail .placeRegistrant'));
  closeEditMode();openPlace({name:'다음 업체',latLng:{lat:10.78,lng:106.71}});
  assert(form.required);assert(!form.readOnly);assert.equal(form.value,'카페회원','new registration remembers the user, not the record edited by an admin');
 })()`);
 dom.window.close();
 console.log('PASS new nickname validation, draft preservation, save/public-read roundtrip, legacy compatibility, safe detail rendering, mobile summary and unchanged owner/admin attribution');
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1});
