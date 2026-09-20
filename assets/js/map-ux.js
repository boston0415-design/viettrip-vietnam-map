/* Shared desktop/mobile browsing. No identity guessing or synthetic business data. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  let browse=null,opening=false,closing=false,nearbyKey='',nearbyHTML='';
  let nearbyMode='expanded',nearbyOrigin=null,nearbyGesture=null;
  const scope=()=>JSON.stringify([state.city,state.cat,state.sub,state.sort,state.query,state.benefitFilter,state.ratingFilter,state.restaurantTag,state.nearby,window.PersonalPlaces?.getView()]);
  const mobile=()=>typeof isMobileMapLayout==='function'&&isMobileMapLayout();
  const collection=()=>typeof items==='function'?items({forList:true}):[];
  const safePhoto=value=>{try{const u=new URL(value,location.href);return /^(https?:|blob:)$/.test(u.protocol)?u.href:''}catch{return ''}};
  function info(p){
    const st=typeof stats==='function'?stats(p.id):{rating:null,count:0,reviews:[]};
    const category=[catLabel(p.category),p.subcategory].filter((x,i,a)=>x&&a.indexOf(x)===i).join(' · ');
    const score=Number.isFinite(st.rating)?`★ ${st.rating.toFixed(1)} · 회원 평가 ${st.count}개`:'회원 평가 없음';
    return {category,score};
  }
  function benefit(p){return p.memberBenefit?`<span class="uxBenefit"><b>${esc(benefitInfoLabel(p))}</b> ${esc(p.benefitText||'혜택 조건은 업소에 확인해 주세요.')}</span>`:''}
  function searchMeta(id){
    const p=db().places.find(p=>p.id===id);if(!p)return '';
    const meta=info(p);return `<small class="searchMemberMeta">${esc(meta.category)} · ${esc(meta.score)}</small>${benefit(p)}`;
  }
  function validBrowse(){return browse&&browse.scope===scope()&&browse.ids.includes(state.selected)}
  function onSelection(){if(!opening)browse=null;}
  function onDetailClosed(){if(!closing)browse=null;}
  function openBusiness(id,source='list'){
    const available=collection();if(!available.some(p=>p.id===id))return;
    browse={source,ids:available.map(p=>p.id),scope:scope(),scroll:el('list')?.scrollTop||0,
      sideScroll:el('businessSide')?.scrollTop||0,railScroll:el('nearbyResultCards')?.scrollLeft||0};
    return choose(id);
  }
  function choose(id){
    if(!browse||!db().places.some(p=>p.id===id))return;
    opening=true;
    let result;
    try{result=selectPlace(id,true,false)}finally{opening=false}
    syncNearby();
    Promise.resolve(result).catch(()=>{ /* Selection already renders before map animation. */ });
    return result;
  }
  function closeDetail({restore=true}={}){
    const previous=validBrowse()?browse:null;
    closing=true;try{closeDetailPanel()}finally{closing=false;browse=null}
    if(restore&&previous?.source==='list'&&mobile())openMobileBusinessList();
    if(restore&&previous){
      if(el('list'))el('list').scrollTop=previous.scroll;
      if(el('businessSide'))el('businessSide').scrollTop=previous.sideScroll;
      if(el('nearbyResultCards'))el('nearbyResultCards').scrollLeft=previous.railScroll;
    }
    syncNearby();
    return true;
  }
  function decorateDetail(){
    if(!validBrowse())return;
    const panel=el('detail'),header=panel?.querySelector('.detailHeader');if(!header)return;
    panel.querySelector('.browseNavigation')?.remove();
    const ids=browse.ids.filter(id=>db().places.some(p=>p.id===id)),index=ids.indexOf(state.selected);
    if(index<0)return;
    const nav=document.createElement('nav');nav.className='browseNavigation';nav.setAttribute('aria-label','업소 이어보기');nav.setAttribute('data-no-sheet-drag','');
    nav.innerHTML=`<button type="button" data-browse-back>← ${browse.source==='nearby'?'주변목록':'업체목록'}</button><span>${index+1} / ${ids.length}</span><button type="button" data-browse-prev ${index===0?'disabled':''} aria-label="이전 업소">이전</button><button type="button" data-browse-next ${index===ids.length-1?'disabled':''} aria-label="다음 업소">다음</button>`;
    header.after(nav);
    nav.querySelector('[data-browse-back]').onclick=()=>closeDetail();
    nav.querySelector('[data-browse-prev]').onclick=()=>{if(index>0)choose(ids[index-1]);};
    nav.querySelector('[data-browse-next]').onclick=()=>{if(index+1<ids.length)choose(ids[index+1]);};
  }
  function syncNearby(){
    const tray=el('nearbyResults');if(!tray)return;
    const origin=state.nearby;
    const key=JSON.stringify(origin);
    if(!origin||origin!==nearbyOrigin||key!==nearbyKey){nearbyMode='expanded';nearbyOrigin=origin;}
    const blocked=!origin||Boolean(state.selected)||Boolean(state.registerMode)||Boolean(window.PlaceSearch?.currentPlace());
    tray.hidden=blocked||nearbyMode==='closed';
    const reopen=el('nearbyReopen');if(reopen)reopen.hidden=blocked||nearbyMode!=='closed';
    tray.classList.toggle('isCollapsed',nearbyMode==='collapsed');
    if(el('nearbyResultsBody'))el('nearbyResultsBody').hidden=nearbyMode==='collapsed';
    el('nearbyResizeGrip')?.setAttribute('aria-valuenow',nearbyMode==='collapsed'?'0':'1');
    const toggle=el('nearbyCollapse');if(toggle){toggle.textContent=nearbyMode==='collapsed'?'펼치기':'접기';toggle.setAttribute('aria-expanded',String(nearbyMode!=='collapsed'));}
    if(!origin){nearbyKey='';return;}
    const all=collection(),shown=all.slice(0,30);
    if(reopen)reopen.textContent=`주변 결과 ${all.length}곳 ▴`;
    const title=el('nearbyResultsTitle');title.textContent=`${origin.name} 주변 · ${all.length}곳`;
    const note=el('nearbyResultsNote');note.textContent=`현재 반경·필터의 등록업소 · 직선거리순${all.length>30?' · 가까운 30곳 표시':''}`;
    // A user may choose another sort in the full list. Describe the actual order.
    if(state.sort!=='distance')note.textContent=`현재 반경·필터의 등록업소${all.length>30?' · 30곳 표시':''}`;
    const html=shown.length?shown.map(p=>{
      const meta=info(p),distance=Number.isFinite(p.distanceMeters)?window.NearbyBusinesses.distanceLabel(p.distanceMeters):'';
      return `<button type="button" class="nearbyResultCard${p.memberBenefit?' hasBenefit':''}" data-nearby-business="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(meta.category)}${distance?' · 직선 '+esc(distance):''}</span><span>${esc(meta.score)}</span>${benefit(p)}</button>`;
    }).join(''):'<p class="nearbyEmpty">이 조건의 등록업소가 없습니다. 반경을 넓히거나 필터를 바꿔주세요.</p>';
    const cards=el('nearbyResultCards');
    if(html!==nearbyHTML){const left=key===nearbyKey?cards.scrollLeft:0;cards.innerHTML=html;cards.scrollLeft=left;nearbyHTML=html;}
    nearbyKey=key;
    positionNearby();
  }
  function setNearbyMode(mode){
    if(!['expanded','collapsed','closed'].includes(mode))return;
    nearbyMode=mode;
    const tray=el('nearbyResults');tray?.style.removeProperty('height');tray?.classList.remove('nearbyDragging');
    syncNearby();
    // Do not leave keyboard focus in newly hidden cards or controls.
    const focus=mode==='closed'?el('nearbyReopen'):el('nearbyCollapse');
    focus?.focus({preventScroll:true});
  }
  function positionNearby(){
    const tray=el('nearbyResults'),legend=el('areaLegend'),wrap=document.querySelector('.mapwrap');if(!tray||!legend||!wrap)return;
    const mapRect=wrap.getBoundingClientRect(),menuRect=legend.getBoundingClientRect();
    const bottom=Math.max(8,mapRect.bottom-menuRect.top+8);
    const max=Math.max(52,Math.min(196,mapRect.height*.34,mapRect.height-bottom-8));
    const filtersOpen=el('areaLegendTitle')?.getAttribute('aria-expanded')==='true';
    for(const node of [tray,el('nearbyReopen')])if(node){
      if(node.style.bottom!==bottom+'px')node.style.bottom=bottom+'px';
      node.classList.toggle('nearbyFiltersOpen',filtersOpen);
    }
    tray.style.setProperty('--nearby-max-height',Math.floor(max)+'px');
  }
  function bindNearbyGrip(tray){
    const grip=el('nearbyResizeGrip');
    const release=event=>{
      const g=nearbyGesture;if(!g||event.pointerId!==g.id)return;
      nearbyGesture=null;
      try{grip.releasePointerCapture(g.id);}catch{}
      if(event.type==='pointercancel'){setNearbyMode(g.mode);return;}
      const dy=event.clientY-g.y;
      setNearbyMode(Math.abs(dy)<24?g.mode:dy>0?'collapsed':'expanded');
    };
    grip.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      nearbyGesture={id:event.pointerId,y:event.clientY,height:tray.getBoundingClientRect().height,mode:nearbyMode};
      try{grip.setPointerCapture(event.pointerId);}catch{}
    });
    grip.addEventListener('pointermove',event=>{
      const g=nearbyGesture;if(!g||event.pointerId!==g.id)return;
      const dy=event.clientY-g.y;if(Math.abs(dy)<6)return;
      event.preventDefault();tray.classList.add('nearbyDragging');
      tray.classList.remove('isCollapsed');el('nearbyResultsBody').hidden=false;
      const max=parseFloat(tray.style.getPropertyValue('--nearby-max-height'))||196;
      tray.style.height=Math.max(52,Math.min(max,g.height-dy))+'px';
    });
    grip.addEventListener('pointerup',release);grip.addEventListener('pointercancel',release);
    grip.addEventListener('lostpointercapture',()=>{if(nearbyGesture){const mode=nearbyGesture.mode;nearbyGesture=null;setNearbyMode(mode);}});
    grip.addEventListener('keydown',event=>{
      const mode={ArrowDown:'collapsed',ArrowUp:'expanded',Home:'collapsed',End:'expanded',Escape:'closed'}[event.key];
      if(mode){event.preventDefault();setNearbyMode(mode);}
    });
  }
  function syncSearchAction(){
    const box=el('placeSearchResults');if(!box)return;
    let button=el('searchRegisterManually');
    if(!button){button=document.createElement('button');button.type='button';button.id='searchRegisterManually';button.className='searchRegisterManually';box.append(button);button.onclick=registerFromSearch;}
    button.hidden=!el('searchInput')?.value.trim();
    button.textContent='찾는 업소가 없나요? 직접 등록하기 +';
  }
  function registerFromSearch(){
    const name=el('searchInput').value.trim();if(!name)return;
    window.PlaceSearch?.dismiss();el('searchInput').blur();
    closeDetailPanel();closeSystemInfo();closeEditMode();
    // addressMode forbids using the current map center as an invented location.
    openPlace({name,addressMode:true});
  }
  function init(){
    const wrap=document.querySelector('.mapwrap');
    if(wrap&&!el('nearbyResults')){
      const tray=document.createElement('section');tray.id='nearbyResults';tray.className='nearbyResults';tray.hidden=true;
      tray.setAttribute('aria-label','주변 등록업소 미리보기');
      tray.innerHTML='<div id="nearbyResizeGrip" class="nearbyResizeGrip" tabindex="0" role="separator" aria-label="주변 결과 접기·펼치기" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="1" aria-valuenow="1" aria-controls="nearbyResultsBody" title="아래로 끌어 접기 · 위로 끌어 펼치기"><span aria-hidden="true"></span></div><div class="nearbyResultsHead"><strong id="nearbyResultsTitle"></strong><button id="nearbyCollapse" type="button" aria-controls="nearbyResultsBody" aria-expanded="true">접기</button><button id="nearbyClose" type="button" aria-label="주변 결과 닫기">×</button></div><div id="nearbyResultsBody"><div class="nearbyResultsMeta"><small id="nearbyResultsNote"></small><button id="nearbyAllResults" type="button">전체 목록 ›</button></div><div id="nearbyResultCards" class="nearbyResultCards"></div></div>';
      wrap.append(tray);
      const reopen=document.createElement('button');reopen.id='nearbyReopen';reopen.className='nearbyReopen';reopen.type='button';reopen.hidden=true;reopen.setAttribute('aria-controls','nearbyResults');wrap.append(reopen);
      reopen.onclick=()=>setNearbyMode('expanded');
      el('nearbyCollapse').onclick=()=>setNearbyMode(nearbyMode==='collapsed'?'expanded':'collapsed');
      el('nearbyClose').onclick=()=>setNearbyMode('closed');
      bindNearbyGrip(tray);
      el('nearbyAllResults').onclick=()=>{if(mobile())openMobileBusinessList();else{if(document.querySelector('.content')?.classList.contains('desktopListCollapsed'))el('desktopListToggle')?.click();el('list')?.scrollIntoView({block:'nearest'});}};
      tray.addEventListener('click',event=>{const b=event.target.closest('[data-nearby-business]');if(b)openBusiness(b.dataset.nearbyBusiness,'nearby');});
    }
    initPhotos();syncNearby();
    if(window.ResizeObserver){const observer=new ResizeObserver(positionNearby);if(el('areaLegend'))observer.observe(el('areaLegend'));if(wrap)observer.observe(wrap);}
    window.addEventListener('resize',positionNearby);
  }
  function initPhotos(){
    if(el('memberPhotoViewer'))return;
    const dialog=document.createElement('dialog');dialog.id='memberPhotoViewer';dialog.className='travellerDialog memberPhotoViewer';
    dialog.setAttribute('data-no-sheet-resize','');dialog.setAttribute('aria-label','회원 사진 크게 보기');
    dialog.innerHTML='<div class="photoViewerHead"><span id="memberPhotoCount" role="status" aria-live="polite"></span><button id="memberPhotoClose" type="button" aria-label="사진 닫기">×</button></div><div class="photoViewerCanvas"><img id="memberPhotoImage" alt="회원 사진"><p id="memberPhotoError" role="status" hidden>사진을 불러오지 못했습니다.</p></div><div class="photoViewerFoot"><button id="memberPhotoPrev" type="button">← 이전 사진</button><span>확대는 두 손가락으로</span><button id="memberPhotoNext" type="button">다음 사진 →</button></div>';
    document.body.append(dialog);
    let gallery=[],index=0,opener=null,saved=null;
    const paint=()=>{
      const photo=gallery[index];if(!photo)return;
      el('memberPhotoError').hidden=true;
      el('memberPhotoImage').src=photo.url;el('memberPhotoImage').alt=photo.alt||'회원 사진';
      el('memberPhotoCount').textContent=`회원 사진 ${index+1} / ${gallery.length}`;
      el('memberPhotoPrev').disabled=index===0;el('memberPhotoNext').disabled=index===gallery.length-1;
    };
    el('memberPhotoImage').onerror=()=>{el('memberPhotoError').hidden=false;};
    el('memberPhotoClose').onclick=()=>dialog.close();
    el('memberPhotoPrev').onclick=()=>{if(index>0){index--;paint();}};
    el('memberPhotoNext').onclick=()=>{if(index+1<gallery.length){index++;paint();}};
    dialog.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'){event.preventDefault();el('memberPhotoPrev').click();}
      if(event.key==='ArrowRight'){event.preventDefault();el('memberPhotoNext').click();}
    });
    dialog.addEventListener('close',()=>{
      if(saved){for(const [node,top,left] of saved){if(node.isConnected){node.scrollTop=top;node.scrollLeft=left;}}}
      if(opener?.isConnected)opener.focus({preventScroll:true});
      gallery=[];el('memberPhotoImage').removeAttribute('src');saved=null;
    });
    document.addEventListener('click',event=>{
      const link=event.target.closest('.placePhotos a,.reviewPhotos a,.communityReviewPhotos a');
      if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const url=safePhoto(link.getAttribute('href'));if(!url)return;
      const links=[...link.parentElement.querySelectorAll('a')];
      gallery=links.map(a=>({url:safePhoto(a.getAttribute('href')),alt:a.querySelector('img')?.alt})).filter(p=>p.url);
      index=gallery.findIndex(p=>p.url===url);if(index<0)return;
      event.preventDefault();event.stopPropagation();opener=link;
      saved=[];for(let node=link;node;node=node.parentElement)saved.push([node,node.scrollTop,node.scrollLeft]);
      paint();if(!dialog.open)dialog.showModal();el('memberPhotoClose').focus({preventScroll:true});
    },true);
  }
  window.MapUX={openBusiness,closeDetail,decorateDetail,onSelection,onDetailClosed,syncNearby,searchMeta,syncSearchAction,registerFromSearch};
  // Register the photo dialog before panel-history collects dialog layers.
  init();
})();
