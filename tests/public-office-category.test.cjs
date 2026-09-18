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
    fillAdmin();assert([...$('#pCat').options].some(o=>o.value==='public_office'&&o.text==='공공기관'));
    for(const [i,sub] of CONFIG.categories.public_office.subs.entries()){
      openPlace({name:'등록 검증 '+i,category:'public_office',subcategory:sub,address:'Ho Chi Minh City',latLng:{lat:10.77+i*.01,lng:106.7}});
      assert.equal($('#pCat').value,'public_office');assert.equal($('#pSub').value,sub);assert.equal($('#pSub').options.length,6);
      $('#pNickname').value='등록자';await savePlaceOnce();assert.equal(writes.at(-1).category,'public_office');assert.equal(writes.at(-1).subcategory,sub);
    }
    const member=fixture.places[0];openEditPlace(member,'owner');assert.equal($('#pCat').value,'public_office');
    $('#pSub').value='우체국';updateExistingPlaceWithFallback=async(id,current,patch)=>{patches.push(patch);return {ok:true}};
    fetchSharedDb=async()=>fixture;await savePlaceOnce();assert.equal(patches[0].category,'public_office');assert.equal(patches[0].subcategory,'우체국');closeEditMode();
    member.subcategory='대사관·영사관';fixture.places.push({...member,id:'elsewhere',cityKey:'hanoi',area:'하노이',address:'Hanoi',lat:21.03,lng:105.85});
    fixture.places.push({...member,id:'massage',category:'spa',subcategory:'마사지'});
    state.city='hcmc';state.navCategory=null;state.cat='all';state.sub='all';state.query='공공기관';
    assert.equal(items().length,6,'category name search includes every public office subtype');state.query='';
    const markers=[];google={maps:{Size:class{},Point:class{},Marker:class{constructor(o){markers.push(o)}setMap(){}addListener(){}}}};
    state.map={};bindMapFeatureInfo=()=>{};makeBounds=()=>({});extendBoundsByCircle=()=>{};fitUnifiedBounds=()=>{};
    closeSystemInfo=()=>{};clearSelectionRanges=()=>{};clearAreaLabels=()=>{};clearSelectedSystemIcons=()=>{};
    renderHierarchyNav();$('#quickAreas [data-nav-cat="public_office"]').click();
    assert.equal(state.cat,'public_office');assert.equal(state.navCategory,'public_office');assert.equal(items().length,6);
    assert.equal($('#subNav [data-business-sub="우체국"]').textContent,'우체국');
    $('#subNav [data-business-sub="우체국"]').click();assert.equal(items().length,1);assert.equal(items()[0].subcategory,'우체국');
    renderList();assert(!$('#list').textContent.includes('마사지'));assert($('#list').textContent.includes('우체국'));
    assert(markers.length);assert(markers.every(m=>decodeURIComponent(m.icon.url).includes(MAP_SYMBOL_PATHS.account_balance)));
    assert(businessGlyph('public_office','공공기관').includes(MAP_SYMBOL_PATHS.account_balance));
    for(const [type,sub] of Object.entries(PUBLIC_OFFICE_PLACE_TYPES)){
      assert.deepEqual(inferCategory('Public office',[type]),['public_office',sub]);
      assert(isBusinessLikePlace({types:[type]}));assert(!isLikelyAddressName('123 Office','123 Road',[type]));
    }
    for(const name of ['출입국관리사무소','Immigration Department','Cục Quản lý xuất nhập cảnh']){
      assert.deepEqual(inferCategory(name,['local_government_office']),['public_office','출입국관리']);
    }
    assert.deepEqual(inferCategory('Embassy Hotel',['lodging']),['stay','호텔']);
    assert.notEqual(inferCategory('Passport Visa Agency',['travel_agency'])[0],'public_office');
    state.city='all';state.sub='all';renderHierarchyNav();
    assert($('#quickAreas [data-nav-cat="public_office"]'));assert.equal(items().length,7);
    state.city='hanoi';assert.equal(items().length,1);
   })()`);
  }finally{dom.window.close()}
 }
 console.log('PASS desktop/mobile public office registration, subtype edit, city/category search, navigation clicks, list/map civic icons and import classification');
})().catch(e=>{console.error(e);process.exitCode=1});
