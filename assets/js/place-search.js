/* Shared, persistent place search. Google content stays in this open panel only. */
(() => {
  const byId=id=>document.getElementById(id);
  const text=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').trim();
  let revision=0,timer=null,session=null,service=null,rows=[],active=-1,query='',request=null,composing=false,external=null;
  const input=()=>byId('searchInput');
  const rowKey=row=>row.source+':'+(row.id||row.placeId);
  const position=p=>typeof googlePhotoPosition==='function'?googlePhotoPosition(p):null;
  function localMatches(q){
    const key=text(q),words=key.split(' ');if(!key)return [];
    return (db().places||[]).filter(p=>CONFIG.categories[p.category] && p.subcategory!=='프라이빗 룸')
      .map(p=>{
        const name=text(p.name),haystack=text([p.name,p.address,p.area,catLabel(p.category),p.subcategory,(p.tags||[]).join(' ')].join(' '));
        const compact=key.replace(/ /g,'');
        const match=words.every(word=>haystack.includes(word)) || (compact.length>=3 && name.replace(/ /g,'').includes(compact));
        return {p,match,rank:name===key?0:name.startsWith(key)?1:name.includes(key)?2:3};
      }).filter(x=>x.match).sort((a,b)=>a.rank-b.rank||String(a.p.name).localeCompare(String(b.p.name),'ko'))
      .slice(0,8).map(({p})=>({id:p.id,name:p.name,address:[CITY_DATA[placeCityKey(p)]?.label,p.address||p.area].filter(Boolean).join(' · '),source:'member'}));
  }
  function show(message=''){
    const list=byId('placeSearchList'),box=byId('placeSearchResults');if(!list)return;
    box.hidden=false;input().setAttribute('aria-expanded','true');
    // Keep an option's DOM node while Google suggestions arrive. Replacing the
    // touched row between pointerdown and click would drop that selection.
    const old=new Map([...list.children].map(node=>[node.dataset.rowKey,node]));
    rows.forEach((row,i)=>{
      const key=rowKey(row),node=old.get(key)||document.createElement('button');old.delete(key);
      node.type='button';node.className='placeSearchOption';node.id='placeSuggestion'+i;node.dataset.searchIndex=i;node.dataset.rowKey=key;
      node.setAttribute('role','option');node.setAttribute('aria-selected',String(i===active));
      const html=`<span class="searchResultIcon" aria-hidden="true">${row.source==='member'?'◉':'⌖'}</span><span class="searchResultCopy"><strong>${esc(row.name)}</strong><small>${esc(row.address||'주소 확인 중')}</small><em>${row.source==='member'?'회원 등록 업소':'Google 지도 장소'}</em></span>`;
      if(node.innerHTML!==html)node.innerHTML=html;
      if(list.children[i]!==node)list.insertBefore(node,list.children[i]||null);
    });
    for(const node of old.values())node.remove();
    byId('placeSearchStatus').textContent=message || (rows.length?'업소를 선택하면 상세 정보를 볼 수 있어요.':'일치하는 장소가 없습니다. 이름이나 도로명 주소를 확인해 주세요.');
    byId('placeSearchCredit').hidden=!rows.some(row=>row.source==='google');
    if(active>=0)input().setAttribute('aria-activedescendant','placeSuggestion'+active);else input().removeAttribute('aria-activedescendant');
  }
  function dismiss(){
    revision++;clearTimeout(timer);timer=null;request=null;
    byId('placeSearchResults').hidden=true;input().setAttribute('aria-expanded','false');input().removeAttribute('aria-activedescendant');active=-1;
  }
  function services(){
    const lib=window.google?.maps?.places;
    if(!state.map||!lib?.PlacesService)return null;
    return new lib.PlacesService(state.map);
  }
  async function suggestions(q,version){
    if(request?.q===q && request.version===version)return request.promise;
    const lib=window.google?.maps?.places;
    if(!lib?.AutocompleteService || !state.map){show(rows.length?'회원 등록 업소입니다. Google 검색은 지도 연결 후 사용할 수 있어요.':'지도 연결 후 다시 검색해 주세요.');return rows;}
    service ||= new lib.AutocompleteService();
    session ||= lib.AutocompleteSessionToken?new lib.AutocompleteSessionToken():undefined;
    const promise=(async()=>{
      try{
        const center=position(state.map.getCenter?.())||currentCity()?.center;
        const predictions=await googlePhotoRequest(service,'getPlacePredictions',{
          input:q,componentRestrictions:{country:'vn'},sessionToken:session,
          ...(center?{locationBias:{center,radius:50000}}:{})
        });
        if(version!==revision || q!==input().value.trim())return [];
        const local=localMatches(q),memberIds=new Set(local.map(row=>{const p=db().places.find(p=>p.id===row.id);return p?.googlePlaceId||(p?googlePhotoSavedId(googlePhotoKey(p)):null)}));
        const selectedKey=rows[active]?rowKey(rows[active]):null;
        rows=[...local,...(predictions||[]).filter(p=>!memberIds.has(p.place_id)).slice(0,5).map(p=>({placeId:p.place_id,name:p.structured_formatting?.main_text||p.description,address:p.structured_formatting?.secondary_text||'',source:'google'}))];
        active=selectedKey?rows.findIndex(row=>rowKey(row)===selectedKey):-1;show();return rows;
      }catch{
        if(version===revision)show(rows.length?'Google 연결이 지연됩니다. 회원 등록 업소는 선택할 수 있어요.':'Google 검색에 연결하지 못했습니다. 검색 버튼으로 다시 시도해 주세요.');
        return version===revision?rows:[];
      }
    })();
    request={q,version,promise};return promise;
  }
  function changed(event){
    if(event?.type==='input' && external?.loading)closeDetailPanel();
    revision++;clearTimeout(timer);request=null;query=input().value.trim();active=-1;
    if(!query){session=null;dismiss();return;}
    rows=localMatches(query);show(composing?'입력 중…':query.length<2?'두 글자 이상 입력하면 Google 장소도 찾아드려요.':'Google 장소 확인 중…');
    if(composing||query.length<2)return;
    const version=revision,q=query;timer=setTimeout(()=>suggestions(q,version),350);
  }
  function resetScope(){
    window.NearbyBusinesses?.clear({refresh:false});
    window.PersonalPlaces?.setView('all');
    cancelPendingMapWork();clearSelectionRanges();clearAreaLabels();clearSelectedSystemIcons();
    closeSystemInfo();closeAreaPanel();setMobileLegendExpanded(false);
    if(isMobileMapLayout())closeMobileBusinessList();
    state.query='';state.cat='all';state.sub='all';state.navCategory=null;state.selectedNavItem=null;state.restaurantTag='all';state.ratingFilter='all';state.benefitFilter='all';state.areaType='all';state.hospitalSpecialty='all';
  }
  async function openMember(id){
    const p=db().places.find(p=>p.id===id);if(!p)return;
    dismiss();session=null;input().blur();clearSearchMarker();resetScope();
    state.city=placeCityKey(p)||'all';input().value=p.name;
    renderCityControls();renderAreaList();renderPopularAreas();renderAll();renderHierarchyNav();
    const selection=selectPlace(p.id,true,false);setDetailExpanded(true);await selection;
  }
  function currentPlace(){return external?.place||null;}
  function clearExternal(){
    if(!external)return;
    external=null;state.searchCandidate=null;
    window.DetailSheetResize?.reset();
    if(state.searchMarker){state.searchMarker.setMap(null);state.searchMarker=null;}
    byId('detail')?.classList.remove('externalDetail','show');
    document.querySelector('.mapwrap')?.classList.remove('detailOpen');
  }
  function resultPlace(raw,fallback){
    const pos=position(raw)||position(fallback.position)||{};
    return {name:raw?.name||fallback.name||'선택한 장소',address:raw?.formatted_address||fallback.address||'',placeId:raw?.place_id||fallback.placeId,types:raw?.types||[],...pos};
  }
  async function openGoogle(row){
    if(external?.place.placeId===row.placeId){dismiss();input().blur();setDetailExpanded(true);return true;}
    const searchSession=session;session=null;dismiss();input().blur();
    closeDetailPanel();clearSearchMarker();resetScope();state.selected=null;
    const entry={place:resultPlace(null,row),loading:true,raw:null,error:false,version:0,rendered:-1};external=entry;
    detailPlaceId='google:'+row.placeId;detailExpanded=true;
    renderAll();renderHierarchyNav();
    const svc=services();
    try{
      if(!svc)throw Error('UNAVAILABLE');
      const raw=await googlePhotoRequest(svc,'getDetails',{
        placeId:row.placeId,fields:['place_id','name','formatted_address','geometry','types','business_status','formatted_phone_number','website','opening_hours','utc_offset_minutes','rating','user_ratings_total','photos','url'],
        ...(searchSession?{sessionToken:searchSession}:{})
      });
      if(external!==entry)return true;
      if(!raw)throw Error('NOT_FOUND');
      entry.raw=raw;entry.place=resultPlace(raw,row);entry.loading=false;entry.version++;
      const p=entry.place,registered=findRegisteredMatchForSearch(p);
      if(registered){await openMember(registered.id);return true;}
      input().value=p.name;state.searchCandidate=p;
      if(position(p)){
        state.searchMarker=new google.maps.Marker({map:state.map,position:position(p),title:p.name,zIndex:9998});
        state.searchMarker.addListener('click',()=>{if(external===entry){renderDetail();setDetailExpanded(true)}});
      }
      renderDetail();
      if(position(p)){await focusLocationAtZoom(position(p),17);if(external===entry)positionSelectedPlaceInView();}
    }catch{
      if(external!==entry)return true;
      entry.loading=false;entry.error=true;entry.version++;renderDetail();
    }
    return true;
  }
  function select(row){if(!row)return;return row.source==='member'?openMember(row.id):openGoogle(row);}
  async function submit(){
    if(composing)return;
    if(window.NearbyBusinesses?.active()){dismiss();window.NearbyBusinesses.search(input().value);return;}
    const q=input().value.trim();
    if(!q){dismiss();session=null;closeDetailPanel();clearSearchMarker();resetScope();renderAll();renderHierarchyNav();return;}
    if(!byId('placeSearchResults').hidden && active>=0)return select(rows[active]);
    const matches=localMatches(q),exact=matches.filter(p=>text(p.name)===text(q));
    if(exact.length===1)return openMember(exact[0].id);
    if(q!==query || byId('placeSearchResults').hidden)changed();
    clearTimeout(timer);timer=null;
    const version=revision;const found=await suggestions(q,version);
    if(version!==revision)return;
    if(found.length===1)return select(found[0]);
    if(found.length){show('이름과 주소를 확인한 후 업소를 선택해 주세요.');return;}
    // Explicit submit fallback only: no text-search/nearby calls on every keystroke.
    const svc=services();if(!svc)return;
    try{
      const result=await googlePhotoRequest(svc,'findPlaceFromQuery',{query:q+' Vietnam',fields:['place_id','name','formatted_address','geometry'],...(currentCity()?.center?{locationBias:{center:currentCity().center,radius:50000}}:{})});
      if(version!==revision)return;
      rows=(result||[]).map(p=>({placeId:p.place_id,name:p.name,address:p.formatted_address,position:p.geometry?.location,source:'google'}));
      if(rows.length===1)return select(rows[0]);show();
    }catch{if(version===revision)show('검색 연결이 지연됩니다. 잠시 후 검색 버튼을 다시 눌러주세요.');}
  }
  function photos(entry){
    const slot=byId('externalPhotos');if(!slot || !entry.raw)return;
    if(entry.photos){slot.append(entry.photos);return;}
    const grid=document.createElement('div');grid.className='googlePhotoGrid';entry.photos=grid;slot.append(grid);
    for(const photo of (entry.raw.photos||[]).slice(0,3)){
      let url;try{url=googlePhotoSafeUrl(photo.getUrl({maxWidth:480,maxHeight:360}))}catch{continue;}
      if(!url)continue;
      const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
      link.href=googlePhotoMapsUrl(entry.place,entry.place.placeId);link.target='_blank';link.rel='noopener noreferrer';
      img.src=url;img.alt=entry.place.name+' · Google 지도 사진';img.loading='lazy';img.width=240;img.height=180;img.decoding='async';
      img.addEventListener('error',()=>figure.remove(),{once:true});link.append(img);
      caption.append('사진: ');for(const html of photo.html_attributions||[])caption.append(googlePhotoAttribution(html));
      figure.append(link,caption);grid.append(figure);
    }
  }
  function renderExternal(){
    const entry=external;if(!entry)return false;
    const panel=byId('detail');
    if(window.DetailSheetResize?.isInteracting()){window.DetailSheetResize.deferRefresh();return true;}
    if(entry.rendered===entry.version && panel.classList.contains('externalDetail')){syncDetailPanelLayout();return true;}
    entry.rendered=entry.version;
    const p=entry.place,raw=entry.raw||{},maps=googlePhotoMapsUrl(p,p.placeId);
    const phone=raw.formatted_phone_number,website=googlePhotoSafeUrl(raw.website);
    let opened=null;try{opened=raw.opening_hours?.isOpen?.()}catch{}
    const hours=raw.business_status==='CLOSED_PERMANENTLY'?'폐업':raw.business_status==='CLOSED_TEMPORARILY'?'임시 휴업':opened===true?'영업 중':opened===false?'영업시간 외':'';
    const directions=position(p)?businessDirectionsLinkHtml(p,true):'';
    panel.classList.add('show','externalDetail');document.querySelector('.mapwrap').classList.add('detailOpen');
    panel.innerHTML=`<div class="detailHeader"><div class="detailTitleWrap"><h2>${esc(p.name)}</h2><p class="externalSource">Google 지도 장소</p></div><button id="detailCloseBtn" class="detailClose" type="button" aria-label="상세 닫기">×</button></div>
      <div class="externalMeta">${Number.isFinite(raw.rating)?`<span class="externalRating">★ ${raw.rating.toFixed(1)}</span><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Google 후기 ${(raw.user_ratings_total||0).toLocaleString()}개 ↗</a>`:''}${hours?`<span>${hours}</span>`:''}</div>
      <div class="detailQuickActions externalActions"><button type="button" id="detailExpandBtn" aria-controls="detailBody">상세보기</button>${directions}${phone?`<a class="externalCall" href="tel:${esc(phone.replace(/[^+0-9]/g,''))}">전화</a>`:`<a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Google 지도 ↗</a>`}</div>
      <div id="detailBody" class="detailBody"><p class="externalLoad" role="status">${entry.loading?'장소 정보를 불러오는 중…':entry.error?'상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.':''}</p>
      ${entry.error?'<button type="button" id="retryPlaceDetails" class="btn">다시 불러오기</button>':''}
      <section id="externalPhotos" class="googlePlacePhotos" aria-label="장소 사진"></section>
      <div class="externalInfo">${p.address?`<div><strong>주소</strong><p>${esc(p.address)}</p>${copyButtonHtml('주소 복사',p.address)}</div>`:''}
      ${phone?`<div><strong>전화</strong><a href="tel:${esc(phone.replace(/[^+0-9]/g,''))}">${esc(phone)}</a></div>`:''}
      ${website?`<div><strong>웹사이트</strong><a href="${esc(website)}" target="_blank" rel="noopener noreferrer">공식 웹사이트 ↗</a></div>`:''}
      ${raw.opening_hours?.weekday_text?.length?`<details><summary>영업시간</summary>${raw.opening_hours.weekday_text.map(day=>`<p>${esc(day)}</p>`).join('')}</details>`:''}</div>
      <div class="externalFooter"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Google 지도에서 전체 정보·후기 보기 ↗</a>${!entry.loading&&!entry.error&&position(p)?'<button type="button" id="registerSearchPlace" class="btn primary">이 업소 등록</button>':''}<p>Google 정보와 회원 등록 정보는 구분해 표시합니다.</p><div id="externalAttributions"></div></div></div>`;
    photos(entry);
    for(const html of raw.html_attributions||[])byId('externalAttributions').append(googlePhotoAttribution(html));
    byId('detailCloseBtn').onclick=closeDetailPanel;byId('detailExpandBtn').onclick=()=>setDetailExpanded(!detailExpanded);
    if(byId('registerSearchPlace'))byId('registerSearchPlace').onclick=openSearchResultRegistration;
    if(byId('retryPlaceDetails'))byId('retryPlaceDetails').onclick=()=>{const retry={...p};clearExternal();openGoogle(retry)};
    syncDetailPanelLayout();return true;
  }
  function init(){
    const field=input();if(!field || field.dataset.placeSearchBound)return;field.dataset.placeSearchBound='true';
    field.addEventListener('compositionstart',()=>{composing=true;revision++;clearTimeout(timer)});
    field.addEventListener('compositionend',()=>{composing=false;changed()});
    field.addEventListener('input',changed);
    field.addEventListener('focus',()=>{if(field.value.trim())changed()});
    field.addEventListener('keydown',event=>{
      if(event.isComposing||composing||event.keyCode===229)return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dismiss();return;}
      if(event.key==='Enter'){event.preventDefault();submit();return;}
      if(['ArrowDown','ArrowUp'].includes(event.key) && rows.length){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;show();byId('placeSuggestion'+active)?.scrollIntoView({block:'nearest'});}
    });
    byId('placeSearchList').addEventListener('mousedown',event=>event.preventDefault());
    byId('placeSearchList').addEventListener('click',event=>{const item=event.target.closest('[data-search-index]');if(item)select(rows[Number(item.dataset.searchIndex)])});
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.search'))dismiss()});
    document.addEventListener('focusin',event=>{if(!event.target.closest('.search'))dismiss()});
    // Shrinking mobile keyboards must not clip the suggestion list.
    const resize=()=>{const rect=field.closest('.search').getBoundingClientRect(),viewport=window.visualViewport;byId('placeSearchResults').style.maxHeight=Math.max(100,(viewport?.height||innerHeight)+(viewport?.offsetTop||0)-rect.bottom-12)+'px'};
    window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);field.addEventListener('focus',resize);resize();
  }
  window.PlaceSearch={init,submit,openGoogle,openMember,currentPlace,clearExternal,renderDetail:renderExternal,localMatches,dismiss};
})();
