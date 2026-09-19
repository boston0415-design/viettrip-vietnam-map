const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));
async function fixture(query='',{mobile=false,delayed=false,missing=false,offline=false,hidden=false}={}){
  const dom=new JSDOM(read('index.html'),{url:'https://example.test/'+query,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,context=dom.getInternalVMContext(),run=code=>vm.runInContext(code,context);
  await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  w.assert=assert;w.matchMedia=()=>({matches:mobile});
  for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(f=>/^0[1-8]-/.test(f)).sort())run(read('assets/js/'+file));
  run(`
    const target={id:'shared-1',name:'테스트 <업소>',address:'나트랑 테스트 주소',category:'cafe',subcategory:'카페',...CITY_DATA.nhatrang.center};
    let fixtures=${missing||delayed?'[]':'[target]'},loads=0,dbLoads=0,resolveMap,resolveDb,failMap=${offline};
    db=()=>({places:fixtures,reviews:[]});stats=()=>({rating:null,count:0,reviews:[]});
    state.sharedDbLoading=false;state.cat='spa';state.ratingFilter='4';state.query='old search';
    const map={setZoom:z=>window.zoom=z,setCenter:p=>window.center=p};state.map=${offline||delayed?'null':'map'};
    sharedBootstrapPromise=null;
    bootstrapSharedDb=async()=>{dbLoads++;state.sharedDbLoading=false};
    loadGoogle=async()=>{loads++;${delayed?`await new Promise(r=>resolveMap=r);sharedBootstrapPromise=new Promise(r=>resolveDb=r);`:''}if(failMap)throw Error('offline');state.map=map;return true};
    const noop=()=>{};cancelPendingMapWork=noop;clearAreaLabels=noop;clearSelectionRanges=noop;clearSelectedSystemIcons=noop;closeSystemInfo=noop;setDbStatus=noop;fitSelectedCityView=noop;showCityRange=noop;renderPopularAreas=noop;renderAreaList=noop;clearPremiumEffects=noop;bindMapFeatureInfo=noop;refreshRegisteredCoverage=noop;refreshMapAfterMobileLayout=noop;closeMobileBusinessList=noop;setMobileLegendExpanded=noop;
    positionSelectedPlaceInView=()=>window.positioned=true;businessMarkerIcon=()=>({});
    google={maps:{Marker:class {constructor(options){this.options=options}setMap(){}addListener(){}}}};
    renderAll=()=>{renderList();renderMarkers();renderDetail()};
    window.PersonalPlaces={getView:()=>window.personalView||'favorites',setView:v=>window.personalView=v,filter:places=>places.filter(p=>!${hidden}||p.id!=='shared-1'),isHidden:id=>${hidden}&&id==='shared-1',isFavorite:()=>false};
  `);
  run(read('assets/js/business-share.js'));await tick();
  return {w,run,close:()=>w.close()};
}
(async()=>{
  for(const mobile of [false,true]){
    const f=await fixture('?place=shared-1&from=guide&city=hanoi',{mobile,hidden:true});
    f.run(`assert.equal(state.selected,'shared-1');assert.equal(state.city,'nhatrang');assert.equal(state.cat,'all');assert.equal(state.ratingFilter,'all');assert.equal(state.query,'');assert.equal(window.personalView,'all');assert.equal(window.zoom,17);assert.equal(window.positioned,true);assert.equal(state.markers.length,1);assert.equal(state.markers[0]._placeId,'shared-1');assert.equal(PersonalPlaces.isHidden('shared-1'),true)`);
    // Existing guide auto-navigation must not override the explicit business.
    f.run(read('assets/js/guide-map-link.js'));f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));await tick();
    assert(!f.w.document.getElementById('guideMapNotice'));
    f.run(`assert.equal(state.city,'nhatrang');setDetailExpanded(true)`);
    const buttons=f.w.document.querySelectorAll('.businessShare .copyBtn');assert.equal(buttons.length,2);
    const copied=decodeURIComponent(buttons[0].dataset.copyValue);
    assert.equal(copied,'테스트 <업소>\n나트랑 테스트 주소\n베트남맵에서 위치·후기 보기\nhttps://viettrip-vietnam-map.pages.dev/?place=shared-1');
    assert.equal(decodeURIComponent(buttons[1].dataset.copyValue),'https://viettrip-vietnam-map.pages.dev/?place=shared-1');
    assert(!f.w.document.querySelector('.businessShare script'));
    let clipboard;Object.defineProperty(f.w,'isSecureContext',{value:true});Object.defineProperty(f.w.navigator,'clipboard',{value:{writeText:async value=>clipboard=value}});
    f.w.handleCopyButton({preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}},buttons[0]);await tick();assert.equal(clipboard,copied);assert.equal(buttons[0].textContent,'복사됨 ✓');
    f.run(`closeDetailPanel();assert.equal(state.markers.length,0);assert.equal(PersonalPlaces.isHidden('shared-1'),true);assert.equal(BusinessShare.url({id:'bad?id'}),'')`);
    f.close();
  }
  const delayed=await fixture('?place=shared-1',{delayed:true});
  delayed.run(`assert.equal(state.selected,null);resolveMap()`);await tick();
  delayed.run(`assert.equal(state.selected,null);fixtures=[target];resolveDb();sharedBootstrapPromise=null`);await tick();
  delayed.run(`assert.equal(state.selected,'shared-1')`);delayed.close();
  const canceled=await fixture('?place=shared-1',{delayed:true});
  canceled.w.document.querySelector('.content').dispatchEvent(new canceled.w.Event('pointerdown',{bubbles:true}));
  canceled.run(`resolveMap()`);await tick();canceled.run(`fixtures=[target];resolveDb();sharedBootstrapPromise=null`);await tick();
  canceled.run(`assert.equal(state.selected,null);assert.equal(state.cat,'spa')`);assert.match(canceled.w.document.getElementById('businessShareNotice').textContent,/이동을 멈췄/);canceled.close();
  const missing=await fixture('?place=shared-1',{missing:true});assert.match(missing.w.document.getElementById('businessShareNotice').textContent,/찾을 수 없습니다/);
  missing.run(`fixtures=[target]`);missing.w.document.querySelector('#businessShareNotice button').click();await tick();missing.run(`assert.equal(state.selected,'shared-1');assert.equal(dbLoads,1)`);missing.close();
  const offline=await fixture('?place=shared-1',{offline:true});offline.run(`assert.equal(state.selected,'shared-1')`);assert.match(offline.w.document.getElementById('businessShareNotice').textContent,/지도를 연결하지 못해/);offline.close();
  const invalid=await fixture('?place=%3Cscript%3E');invalid.run(`assert.equal(loads,0);assert.equal(state.selected,null)`);invalid.close();
  const normal=await fixture('');normal.run(`assert.equal(loads,0);assert.equal(state.cat,'spa')`);assert(!normal.w.document.getElementById('businessShareNotice'));normal.close();
  console.log('PASS desktop/mobile share copy, city/filter reset, hidden pin cleanup, guide priority, delayed DB/map readiness, cancellation, retry, offline detail and invalid link (network/map emulated)');
})().catch(error=>{console.error(error);process.exitCode=1});
