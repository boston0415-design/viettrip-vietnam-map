// Local UI fixtures only; production places and reviews are never touched.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=p=>fs.readFileSync(p,'utf8'),pause=()=>new Promise(r=>setTimeout(r,25));
(async()=>{
 for(const mobile of [true,false]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,run=code=>vm.runInContext(code,dom.getInternalVMContext()),el=id=>d.getElementById(id);
  w.matchMedia=q=>({matches:q.includes('max-width')?mobile:!mobile});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  for(const f of fs.readdirSync('assets/js').filter(f=>/^0[1-8]-/.test(f)).sort())run(read('assets/js/'+f));
  run(read('assets/js/place-photos.js'));
  run(`
   const fixture={places:[{id:'cafe',name:'테스트 카페',category:'cafe',subcategory:'카페',address:'호치민',lat:10.77,lng:106.7,initialRating:4}],reviews:[{id:'review',placeId:'cafe',nickname:'회원',text:'원래 후기',rating:4}]};
   db=()=>fixture;isOwnerPlace=()=>false;const noop=()=>{};
   renderList=noop;renderMarkers=noop;refreshRegisteredCoverage=noop;renderCityControls=noop;renderAreaList=noop;renderPopularAreas=noop;renderCats=noop;renderHierarchyNav=noop;renderRatingFilterState=noop;
   clearSelectionRanges=noop;clearAreaLabels=noop;clearSelectedSystemIcons=noop;refreshMapAfterMobileLayout=noop;positionSelectedPlaceInView=noop;cancelPendingMapWork=noop;focusLocationAtZoom=async()=>{};
   state.sharedDbLoading=false;state.city='hcmc';state.cat='cafe';state.ratingFilter='4';state.benefitFilter='all';
   state.nearby={name:'내 숙소',lat:10.77,lng:106.7,radius:2000};
   window.NearbyBusinesses={distanceLabel:distance=>distance+'m',sync:noop,clear:()=>{state.nearby=null}};
   state.map={getCenter:()=>({lat:()=>10.77,lng:()=>106.7}),setCenter:noop};
   const pendingDetails=[],pendingPredictions=[];
   google={maps:{event:{trigger:noop},places:{AutocompleteSessionToken:class{},AutocompleteService:class{getPlacePredictions(r,cb){pendingPredictions.push(cb)}},PlacesService:class{getDetails(r,cb){pendingDetails.push(cb)}}}}};
  `);
  run(read('assets/js/list-layout.js'));run(read('assets/js/place-search.js'));run(read('assets/js/map-ux.js'));run(read('assets/js/ai-map-search.js'));
  w.PlaceSearch.init();await pause();
  let pendingAI;w.fetch=()=>new Promise(resolve=>{pendingAI=resolve});
  const query=el('aiMapQuestion'),search=el('searchInput'),content=d.querySelector('.content');
  const showList=()=>{if(mobile)run('openMobileBusinessList()');else w.ListLayout.setCollapsed(false)};
  const listClosed=()=>assert(mobile?!el('businessSide').classList.contains('mobileOpen'):content.classList.contains('desktopListCollapsed'));
  const criteria=()=>run('JSON.stringify([state.city,state.cat,state.sub,state.ratingFilter,state.benefitFilter,state.nearby,fixture])');
  const original=criteria();
  showList();el('businessSide').scrollTop=130;
  query.focus();listClosed();assert(content.classList.contains('searchActive'));assert(el('nearbyResults').hidden);
  assert.equal(el('businessSide').scrollTop,130,'search does not reset the saved list position');assert.equal(criteria(),original);
  query.value='카페 찾아줘';query.dispatchEvent(new w.Event('input'));
  el('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  search.value='테스트 카페';search.focus();search.dispatchEvent(new w.Event('input'));
  assert(el('aiMapPanel').hidden);assert(!el('placeSearchResults').hidden);listClosed();
  pendingAI({ok:true,json:async()=>({intent:{relevant:true,city:'hcmc',category:'cafe',terms:[],unsupported:[],preferences:[]}})});await pause();
  assert(el('aiMapPanel').hidden,'late AI reply cannot replace ordinary search');assert.equal(el('aiMapResults').children.length,0);
  showList();assert(el('placeSearchResults').hidden);assert(!content.classList.contains('searchActive'));assert.equal(criteria(),original);
  await w.PlaceSearch.openMember('cafe');assert(el('detail').classList.contains('show'));
  query.focus();assert(!el('detail').classList.contains('show'));run('renderAll()');assert(!el('detail').classList.contains('show'),'data refresh cannot revive the old detail');
  w.AIMapSearch.close();query.blur();listClosed();assert(!content.classList.contains('searchActive'));
  const loading=w.PlaceSearch.openGoogle({placeId:'old',name:'이전 Google 업소'});assert(el('detail').classList.contains('show'));
  query.focus();assert(!el('detail').classList.contains('show'));
  run(`pendingDetails[0]({place_id:'old',name:'늦게 도착한 업소'},'OK')`);await loading;
  assert(!el('detail').classList.contains('show'),'late Google details cannot cover a new question');assert.equal(w.PlaceSearch.currentPlace(),null);
  w.AIMapSearch.close();query.blur();assert(!content.classList.contains('searchActive'));
  // A background refresh must keep the nearby tray suppressed throughout search.
  run(`state.nearby={name:'다른 숙소',lat:10.77,lng:106.7,radius:2000}`);query.focus();run('MapUX.syncNearby()');assert(el('nearbyResults').hidden);
  w.AIMapSearch.close();assert(!el('nearbyResults').hidden,'closing search restores available nearby tools');
  assert.equal(run('fixture.reviews[0].text'),'원래 후기');
  dom.window.close();
 }
 console.log('PASS desktop/mobile search exclusivity, preserved filters/list position/reviews, stale AI and Google replies, nearby recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
