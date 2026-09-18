const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 for(const mobile of [false,true]){
  const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
  const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.assert=assert;w.matchMedia=()=>({matches:mobile});
  try{
   for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+name));
   await run(`(async()=>{
    let fixture={places:[],reviews:[]},writes=[],patches=[];
    db=()=>fixture;saveDb=data=>{fixture=data};supaInsert=async(table,row)=>writes.push(row);
    fetchSharedDb=async()=>({places:writes.map(remotePlaceToLocal),reviews:[]});uploadSelectedPlacePhotos=async()=>[];
    initAddressAutocomplete=()=>{};renderAll=()=>{};renderCityControls=()=>{};renderPopularAreas=()=>{};
    focusLocationAtZoom=async()=>{};selectPlace=()=>{};refreshMapAfterMobileLayout=()=>{};
    window.alert=m=>{throw Error(m)};
    fillAdmin();assert([...$('#pCat').options].some(o=>o.value==='barber'&&o.text==='이발소'));
    for(const [i,sub] of ['이발소','미용실'].entries()){
      openPlace({name:'등록 검증 '+i,category:'barber',subcategory:sub,address:'Ho Chi Minh City',latLng:{lat:10.77+i*.01,lng:106.7}});
      assert.equal($('#pCat').value,'barber');assert.equal($('#pSub').value,sub);assert.equal($('#pSub').options.length,2);
      $('#pNickname').value='등록자';await savePlaceOnce();assert.equal(writes.at(-1).category,'barber');assert.equal(writes.at(-1).subcategory,sub);
    }
    const member=fixture.places[0];openEditPlace(member,'owner');assert.equal($('#pCat').value,'barber');
    $('#pSub').value='미용실';updateExistingPlaceWithFallback=async(id,current,patch)=>{patches.push(patch);return {ok:true}};
    fetchSharedDb=async()=>fixture;await savePlaceOnce();assert.equal(patches[0].category,'barber');assert.equal(patches[0].subcategory,'미용실');closeEditMode();
    member.subcategory='이발소';fixture.places.push({...member,id:'elsewhere',cityKey:'hanoi',area:'하노이',address:'Hanoi',lat:21.03,lng:105.85});
    fixture.places.push({...member,id:'massage',category:'spa',subcategory:'마사지'});
    state.city='hcmc';state.navCategory=null;state.cat='all';state.sub='all';state.query='이발소';
    assert.equal(items().length,2,'category name search includes both barber and hair salon');state.query='';
    const markers=[];google={maps:{Size:class{},Point:class{},Marker:class{constructor(o){markers.push(o)}setMap(){}addListener(){}}}};
    state.map={};bindMapFeatureInfo=()=>{};makeBounds=()=>({});extendBoundsByCircle=()=>{};fitUnifiedBounds=()=>{};
    closeSystemInfo=()=>{};clearSelectionRanges=()=>{};clearAreaLabels=()=>{};clearSelectedSystemIcons=()=>{};
    renderHierarchyNav();$('#quickAreas [data-nav-cat="barber"]').click();
    assert.equal(state.cat,'barber');assert.equal(state.navCategory,'barber');assert.equal(items().length,2);
    assert.equal($('#subNav [data-business-sub="미용실"]').textContent,'미용실');
    $('#subNav [data-business-sub="미용실"]').click();assert.equal(items().length,1);assert.equal(items()[0].subcategory,'미용실');
    renderList();assert(!$('#list').textContent.includes('마사지'));assert($('#list').textContent.includes('미용실'));
    assert(markers.length);assert(markers.every(m=>decodeURIComponent(m.icon.url).includes(MAP_SYMBOL_PATHS.content_cut)));
    assert(businessGlyph('barber','이발소').includes(MAP_SYMBOL_PATHS.content_cut));
    for(const [name,types,expected] of [
      ['Barber Shop',['barber_shop'],['barber','이발소']],['우리 이발소',['spa'],['barber','이발소']],
      ['Hớt Tóc Anh',['hair_care'],['barber','이발소']],['Salon',['hair_salon'],['barber','미용실']],
      ['미용실',['hair_care'],['barber','미용실']],['Massage',['spa'],['spa','스파']]
    ])assert.deepEqual(inferCategory(name,types),expected);
    for(const type of ['barber_shop','hair_salon','hair_care']){
      assert(isBusinessLikePlace({types:[type]}));assert(!isLikelyAddressName('123 Salon','123 Road',[type]));
    }
   })()`);
  }finally{dom.window.close()}
 }
 console.log('PASS desktop/mobile barber registration, subtype edit, city/category search, navigation clicks, list/map scissors and import classification');
})().catch(e=>{console.error(e);process.exitCode=1});
