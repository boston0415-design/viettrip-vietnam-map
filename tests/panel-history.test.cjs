const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..');
const script=name=>fs.readFileSync(path.join(root,'assets/js',name),'utf8');
const pause=()=>new Promise(resolve=>setTimeout(resolve,20));

async function fixture(mobile=true,{stale=false,denied=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{
    url:'https://example.test/previous',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
  await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  w.matchMedia=()=>({matches:mobile});
  // jsdom supplies real asynchronous History/MutationObserver behavior. Only
  // native dialog presentation and map/data services need local stand-ins.
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
  w.history.pushState({unrelated:'preserve'},'','/map?city=hcmc#selection');
  if(stale)w.history.pushState({unrelated:'preserve',viettripPanelBack:true},'');
  for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(name=>/^0[1-8]-/.test(name)).sort())run(script(name));
  run(`
    renderList=()=>{};renderCityControls=()=>{};renderAreaList=()=>{};syncMobileListCount=()=>{};
    refreshMapAfterMobileLayout=()=>{};positionSelectedPlaceInView=()=>{};hideHover=()=>{};
    google={maps:{InfoWindow:class {
      constructor(){this.events={};this.isOpen=false}
      addListener(name,fn){(this.events[name]||=[]).push(fn)}
      setPosition(){} open(){this.isOpen=true}
      emit(name){(this.events[name]||[]).forEach(fn=>fn())}
      close(){this.isOpen=false;this.emit('close')}
    }}};
    isOwnerPlace=()=>false;clearAddressSearchMarker=()=>{};resetPlacePhotoDraftUi=()=>{};closeEditMode=()=>{};
    let reviewDraftResets=0;resetReviewDraftUi=()=>reviewDraftResets++;
    db=()=>({places:[{id:'a',name:'업체',category:'spa',subcategory:'발마사지',address:'주소',lat:10.77,lng:106.7}],reviews:[]});
    const marker={setMap(){throw Error('Back must not change map markers or ranges')}};
    Object.assign(state,{city:'hcmc',cat:'spa',sub:'발마사지',navCategory:'spa',ratingFilter:'4',benefitFilter:'benefit',query:'검색',markers:[marker],selectionOverlays:[marker]});
    bindAreaNavigation();
  `);
  const events=script('09-init-events.js');
  const eventStart=events.indexOf("window.addEventListener('resize',()=>{");
  run(events.slice(eventStart,events.indexOf("$('#mapRetryBtn')",eventStart)));
  if(denied){w.history.pushState=()=>{throw new w.DOMException('Disabled','SecurityError')};w.console.warn=()=>{}}
  run(script('panel-history.js'));
  await pause();
  const node=id=>w.document.getElementById(id);
  const guarded=()=>Boolean(w.history.state?.viettripPanelBack);
  const activate=()=>w.document.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  let pushes=0;const push=w.history.pushState.bind(w.history);w.history.pushState=(...args)=>{pushes++;return push(...args)};
  const criteria=()=>run('JSON.stringify([state.city,state.cat,state.sub,state.ratingFilter,state.benefitFilter,state.query,state.markers,state.selectionOverlays])');
  const before=criteria();
  const back=async()=>{const before=pushes;w.history.back();await pause();assert.equal(pushes,before,'Back must never reinsert entries: Chromium skips them')};
  const action=async code=>{activate();run(code);await pause()};
  return {dom,w,run,node,guarded,criteria,before,back,action,activate};
}

(async()=>{
  for(const mobile of [true,false]){
    const f=await fixture(mobile),{w,run,node,action,back,guarded}=f;
    assert(!guarded(),'no history guard on the initial map');
    const initialLength=w.history.length,url=w.location.href;
    await action('setMobileLegendExpanded(true)');
    assert(guarded());assert.equal(w.history.length,initialLength+1);
    assert.equal(w.history.state.unrelated,'preserve');assert.equal(w.location.href,url);
    await back();assert.equal(node('areaLegendTitle').getAttribute('aria-expanded'),'false');
    assert(!guarded());assert.equal(w.location.href,url);assert.equal(f.criteria(),f.before);

    // X/Map view/Escape consume the entry without needing a second invisible Back.
    for(let i=0;i<5;i++){
      await action('setMobileLegendExpanded(true)');
      if(i===0){node('closeMapFilters').click();await pause()}
      else if(i===1){w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await pause()}
      else await action('setMobileLegendExpanded(false)');
      assert(!guarded(),`close iteration ${i}, filters=${node('areaLegendTitle').getAttribute('aria-expanded')}, state=${JSON.stringify(w.history.state)}`);assert.equal(w.history.length,initialLength+1,'open/close must not accumulate history');
    }

    // Native dialogs above the filter close first. Closing by native Back/Escape
    // instead of popstate leaves the underlying filter protected for the next Back.
    await action('setMobileLegendExpanded(true)');
    node('transportGuideDialog').showModal();await pause();
    await back();assert(!node('transportGuideDialog').open);assert(guarded());
    assert.equal(node('areaLegendTitle').getAttribute('aria-expanded'),'true');
    f.activate();node('communityReviewsDialog').showModal();await pause();node('communityReviewsDialog').close();await pause();
    assert(guarded());await back();assert(!guarded());

    // Replacing filters with the region list still uses one entry.
    await action('setMobileLegendExpanded(true)');
    node('openAreaDirectory').click();await pause();
    assert(node('areaPanel').classList.contains('show'));await back();
    assert(!node('areaPanel').classList.contains('show'));assert(!guarded());

    await action("state.selected='a';renderDetail()");
    await action('setDetailExpanded(true)');
    await action("$('#reviewModal').classList.add('open')");
    await back();assert(!node('reviewModal').classList.contains('open'));
    assert.equal(run('reviewDraftResets'),1);assert(node('detail').classList.contains('show'));
    assert(node('detail').classList.contains('detailExpanded'));
    if(mobile){await back();assert(node('detail').classList.contains('show'));assert(!node('detail').classList.contains('detailExpanded'))}
    await back();assert(!node('detail').classList.contains('show'));assert(!guarded());

    if(mobile){
      await action('openMobileBusinessList()');
      await action("$('#businessSide').classList.add('mobileFiltersOpen')");
      await back();assert(node('businessSide').classList.contains('mobileOpen'));assert(!node('businessSide').classList.contains('mobileFiltersOpen'));
      await back();assert(!node('businessSide').classList.contains('mobileOpen'));assert(!guarded());
    }
    // Registration method -> form is a replacement, not a hidden history page.
    await action("$('#registerMethodModal').classList.add('open')");
    await action("closeModalById('registerMethodModal');$('#placeModal').classList.add('open')");
    await back();assert(!node('placeModal').classList.contains('open'));assert(!guarded());
    await action("state.registerMode=true;$('#regHint').classList.add('show')");
    await back();assert.equal(run('state.registerMode'),false);assert(!guarded());

    // Close then immediately open another panel while history.back is pending.
    await action('setMobileLegendExpanded(true)');
    run('setMobileLegendExpanded(false)');await Promise.resolve();
    f.activate();run("$('#areaPanel').classList.add('show')");await pause();await pause();
    assert(node('areaPanel').classList.contains('show'));assert(guarded());
    await back();assert(!node('areaPanel').classList.contains('show'));assert(!guarded());

    // Google InfoWindow is a real app layer, including native close/X/Escape.
    for(let i=0;i<6;i++){
      await action("showClickInfo({lat:10.77,lng:106.7},'boarding')");
      assert(guarded(),'map card must protect installed-app Back');
      assert.equal(w.history.state.viettripPanelBack.depth,1);
      if(i===0)await back();
      else if(i===1)await action('closeSystemInfo()');
      else if(i===2)await action("state.clickInfo.emit('closeclick')");
      else if(i===3)await action('state.clickInfo.close()'); // Maps Escape
      else if(i===4)await action('state.clickInfo.close();state.clickInfo=null'); // legacy callers
      else {
        run("const previousInfo=state.clickInfo;showClickInfo({lat:10.78,lng:106.71},'replacement');previousInfo.emit('close')");
        await pause();assert(run('Boolean(state.clickInfo)'),'late close cannot erase replacement');
        assert.equal(w.history.state.viettripPanelBack.depth,1);
        await back();
      }
      assert(!run('Boolean(state.clickInfo)'));assert(!guarded());
      assert.equal(w.location.href,url);assert.equal(f.criteria(),f.before);
      assert.equal(w.history.length,initialLength+1,'map cards must not accumulate invisible history');
    }
    await action('setMobileLegendExpanded(true)');
    await action("showClickInfo({lat:10.77,lng:106.7},'replaces filters')");
    assert.equal(node('areaLegendTitle').getAttribute('aria-expanded'),'false');
    assert(node('areaLegendBody').hidden,'expanded filters cannot cover the new card');
    assert.equal(w.history.state.viettripPanelBack.depth,1,'replacing filters keeps one Back step');
    await back();assert(!run('Boolean(state.clickInfo)'));
    assert(!guarded());
    await action("showClickInfo({lat:10.77,lng:106.7},'before reopening filters')");
    await action('setMobileLegendExpanded(true)');
    assert(!run('Boolean(state.clickInfo)'),'reopening filters closes the old card');
    assert.equal(node('areaLegendTitle').getAttribute('aria-expanded'),'true');
    assert.equal(w.history.state.viettripPanelBack.depth,1);
    await back();assert(!guarded());
    await action("showClickInfo({lat:10.77,lng:106.7},'under install dialog')");
    await action("document.getElementById('homeScreenDialog').showModal()");
    await back();assert(!node('homeScreenDialog').open);assert(run('Boolean(state.clickInfo)'));
    await back();assert(!guarded());
    assert.equal(f.criteria(),f.before);assert.equal(w.location.href,url);
    w.history.forward();await pause();await pause();assert(!guarded(),'stale forward entry is consumed');
    await back();assert.equal(w.location.pathname,'/previous','Back on the bare map leaves normally');
    f.dom.window.close();
    console.log(`PASS ${mobile?'mobile':'desktop'}: filters, nested dialogs, details, region/list, cancel/Escape, races, preserved criteria, normal exit`);
  }
  const reload=await fixture(true,{stale:true});
  assert(!reload.guarded());await reload.back();assert.equal(reload.w.location.pathname,'/previous');reload.dom.window.close();
  console.log('PASS reload consumes stale guard');
  const denied=await fixture(true,{denied:true});
  await denied.action('setMobileLegendExpanded(true)');assert.equal(denied.node('areaLegendTitle').getAttribute('aria-expanded'),'true');
  await denied.action('setMobileLegendExpanded(false)');assert.equal(denied.node('areaLegendTitle').getAttribute('aria-expanded'),'false');denied.dom.window.close();
  console.log('PASS unavailable History API leaves ordinary menu controls usable');
})().catch(error=>{console.error(error);process.exit(1)});
