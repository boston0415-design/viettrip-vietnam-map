function locateUser(){
  if(!navigator.geolocation){
    alert('이 브라우저에서는 현재 위치 기능을 지원하지 않습니다.');
    return;
  }

  const btn=$('#locBtn');
  btn.disabled=true;
  btn.textContent='현재 위치 확인 중…';

  if(state.locationWatch!==null){
    navigator.geolocation.clearWatch(state.locationWatch);
    state.locationWatch=null;
  }

  let bestAccuracy=Infinity;
  let first=true;
  let finished=false;

  const finish=()=>{
    if(finished)return;
    finished=true;
    btn.disabled=false;
    if(state.locationWatch!==null){
      navigator.geolocation.clearWatch(state.locationWatch);
      state.locationWatch=null;
    }
    if(bestAccuracy===Infinity) btn.textContent='현재 위치';
  };

  state.locationWatch=navigator.geolocation.watchPosition(pos=>{
    const acc=pos.coords.accuracy || 999999;
    if(acc < bestAccuracy || first){
      bestAccuracy=acc;
      showUserLocation(pos, first);
      first=false;
    }
    // GPS 수준으로 충분히 잡히면 더 이상 대기하지 않음.
    if(acc <= 30) finish();
  }, err=>{
    finish();
    let msg='현재 위치를 가져오지 못했습니다.';
    if(err.code===1) msg='브라우저에서 위치 권한을 허용해주세요.';
    else if(err.code===2) msg='현재 위치를 확인할 수 없습니다. 휴대폰의 위치 서비스를 켜주세요.';
    else if(err.code===3) msg='현재 위치 확인 시간이 초과되었습니다. 다시 눌러주세요.';
    alert(msg);
  },{
    enableHighAccuracy:true,
    timeout:15000,
    maximumAge:0
  });

  // 여러 측정값 중 더 정확한 값을 받을 시간을 줌.
  setTimeout(finish, 12000);
}

let googleLoadPromise=null;
let googleLoadAttempt=0;

function setMapLoadState(mode,title,text=''){
  const box=$('#mapLoadState');
  if(!box)return;
  if(mode==='ready'){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  $('#mapLoadTitle').textContent=title||'지도 불러오는 중…';
  $('#mapLoadText').textContent=text||'잠시만 기다려주세요.';
  const retry=$('#mapRetryBtn');
  retry.style.display=mode==='error'?'inline-flex':'none';
}

function removeGoogleLoaderScripts(){
  document.querySelectorAll('script[data-viettrip-google-loader="1"]').forEach(s=>s.remove());
}

function loadGoogle({force=false}={}){
  if(window.google?.maps){
    try{
      if(!state.map)initMap();
      setMapLoadState('ready');
      return Promise.resolve(true);
    }catch(err){
      console.error('Google Maps init failed',err);
    }
  }

  if(googleLoadPromise && !force)return googleLoadPromise;

  if(force){
    googleLoadPromise=null;
    removeGoogleLoaderScripts();
  }

  googleLoadAttempt++;
  setMapLoadState(
    'loading',
    googleLoadAttempt>1?'지도 다시 연결 중…':'지도 불러오는 중…',
    '네트워크 상태에 따라 몇 초 걸릴 수 있습니다.'
  );

  googleLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.dataset.viettripGoogleLoader='1';
    s.src=`https://maps.googleapis.com/maps/api/js?key=AIzaSyBAkskdybBifvjcRpSmrp_FMEkeuudrnHg&v=weekly&libraries=places`;
    s.async=true;
    s.defer=true;

    let settled=false;
    const finishError=(err)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      reject(err instanceof Error?err:new Error(String(err||'Google Maps load failed')));
    };

    const timer=setTimeout(()=>finishError(new Error('Google Maps 로딩 시간이 초과되었습니다.')),12000);

    s.onload=()=>{
      if(settled)return;
      clearTimeout(timer);
      try{
        if(!window.google?.maps)throw new Error('Google Maps 객체를 불러오지 못했습니다.');
        if(!state.map)initMap();
        settled=true;
        setMapLoadState('ready');
        resolve(true);
      }catch(err){
        finishError(err);
      }
    };
    s.onerror=()=>finishError(new Error('Google Maps 네트워크 로딩에 실패했습니다.'));
    document.head.appendChild(s);
  }).catch(async err=>{
    console.error('Google Maps load attempt failed',err);
    googleLoadPromise=null;

    if(googleLoadAttempt<3){
      await new Promise(r=>setTimeout(r,900*googleLoadAttempt));
      return loadGoogle({force:true});
    }

    setMapLoadState('error','지도를 불러오지 못했습니다.','인터넷 연결을 확인한 뒤 다시 시도해주세요.');
    throw err;
  });

  return googleLoadPromise;
}

async function handleGooglePoiClick(event){
  if(window.PlaceSearch && event?.placeId){event.stop?.();return window.PlaceSearch.openGoogle({placeId:event.placeId,name:'선택한 장소',position:event.latLng});}
  if(!event?.placeId || !event?.latLng)return false;

  // Google 기본 POI 카드가 뜨기 전에 즉시 차단.
  if(event.stop)event.stop();

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;

  closeSystemInfo();
  closeDetailPanel();
  closeAreaPanel();

  const clickPos={
    lat:event.latLng.lat(),
    lng:event.latLng.lng()
  };

  let place=null;
  try{
    place=await getGooglePlaceDetails(event.placeId);
  }catch(err){
    console.error('Google POI details failed',err);
  }

  if(state.mapActionToken!==token)return true;

  if(!place){
    const address=await reverseGeocodeLatLng(event.latLng);
    if(state.mapActionToken!==token)return true;

    state.searchCandidate={
      placeId:event.placeId||'',
      name:'',
      address:address||'',
      lat:clickPos.lat,
      lng:clickPos.lng,
      types:[]
    };

    showClickInfo(
      clickPos,
      infoHtml(
        '선택한 장소',
        'Google 지도 장소',
        address||'장소 정보를 불러오지 못했습니다.',
        `<div style="margin-top:9px"><button type="button" class="btn primary" style="padding:8px 12px;font-size:12px" onclick="openSearchResultRegistration()">이 위치 등록</button></div>`,
        address||'',
        true
      )
    );
    return true;
  }

  const loc=place.geometry?.location || event.latLng;
  const pos={
    lat:typeof loc.lat==='function'?loc.lat():Number(loc.lat),
    lng:typeof loc.lng==='function'?loc.lng():Number(loc.lng)
  };

  clearSearchMarker();

  state.searchCandidate={
    placeId:place.place_id||event.placeId||'',
    name:place.name||'',
    address:place.formatted_address||'',
    lat:pos.lat,
    lng:pos.lng,
    types:place.types||[]
  };

  // 선택한 Google 업체 위치를 명확하게 표시.
  state.searchMarker=new google.maps.Marker({
    map:state.map,
    position:pos,
    title:place.name||'선택한 업체',
    zIndex:9998
  });
    bindMapFeatureInfo(state.searchMarker,{...state.searchCandidate,type:'검색한 장소'},pos);

  const existing=findRegisteredMatchForSearch(state.searchCandidate);

  const actionHtml=existing
    ? `<div style="margin-top:9px"><button type="button" class="btn primary" style="padding:8px 12px;font-size:12px" onclick="openRegisteredSearchResult('${existing.id}')">등록된 업체 보기</button></div>`
    : `<div style="margin-top:9px"><button type="button" class="btn primary" style="padding:8px 12px;font-size:12px" onclick="openSearchResultRegistration()">이 업체 등록</button></div>`;

  showClickInfo(
    pos,
    infoHtml(
      place.name||'선택한 업체',
      'Google 지도 업체',
      place.formatted_address||'',
      `<div style="font-size:11px;color:#64748b;margin-top:6px">${existing?'이미 등록된 업체와 일치합니다.':'아직 우리 업체 DB에 등록되지 않은 장소입니다.'}</div>${actionHtml}`,
      place.formatted_address||'',
      true
    )
  );

  return true;
}

function initMap(){
  if(state.map){
    setMapLoadState('ready');
    refreshMapAfterMobileLayout();
    return state.map;
  }
  const mapEl=$('#map');
  if(!mapEl)throw new Error('지도 영역을 찾지 못했습니다.');
  state.map=new google.maps.Map(mapEl,{center:CITY_DATA.hcmc.center,zoom:CITY_DATA.hcmc.zoom,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,zoomControl:false,gestureHandling:'greedy',scrollwheel:true,isFractionalZoomEnabled:true});
  // Zoom changes also fire during search camera animations. Only a deliberate
  // map drag dismisses transient cards; the selected detail sheet stays open.
  for(const event of ['dragstart','zoom_changed'])state.map.addListener(event,()=>{
    hideHover();
    if(event==='dragstart' && !supportsMapHover())closeSystemInfo();
    if(event==='zoom_changed')refreshReferenceRangeVisibility();
  });
  initAddressAutocomplete();
  state.map.addListener('click',e=>{
    if(window.NearbyBusinesses?.handleMapClick(e))return;
    setMobileLegendExpanded(false);
    closeSystemInfo();
    // 업체 등록 모드에서는 기존 등록용 클릭 로직 사용.
    if(state.registerMode){
      registerMapClick(e);
      return;
    }

    // Google 지도에 원래 표시되는 업체/POI 아이콘 클릭.
    // 기본 Google 카드 대신 우리 등록/보기 팝업을 표시한다.
    if(e.placeId){
      if(e.stop)e.stop();
      handleGooglePoiClick(e);
      return;
    }

    state.clickLatLng=e.latLng;

    // 빈 지도는 정보창만 닫는다. 선택한 분류의 아이콘과 범위는 유지한다.
    closeDetailPanel();
    closeAreaPanel();
  });
  renderPopularAreas();
  renderGolfCourses();
  renderPoiMarkers();
  clearSelectionRanges();
  renderAll();

  // 공용 DB는 페이지 시작과 동시에 별도로 불러온다.
  // 지도 초기화가 느린 모바일에서도 저장 업체가 먼저 보이도록 지도와 분리.
  initDeviceHash();
  renderAll();
  setMapLoadState('ready');
  setTimeout(refreshMapAfterMobileLayout,80);
  bootstrapSharedDb().catch(()=>{});
  return state.map;
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    bootstrapSharedDb({force:true}).catch(()=>{});
    if(!state.map)loadGoogle({force:true}).catch(()=>{});
    else refreshMapAfterMobileLayout();
  }
});

document.querySelectorAll('[data-rating-filter]').forEach(btn=>{
  btn.addEventListener('click',async ()=>{
    cancelPendingMapWork();
    const value=btn.dataset.ratingFilter;
    const turningOff=state.ratingFilter===value;

    // 회원평점은 현재 선택한 도시·분류·검색 조건에 추가로 적용한다.
    state.ratingFilter=turningOff?'all':value;
    state.selected=null;

    closeSystemInfo();

    renderRatingFilterState();
    renderHierarchyNav();
    renderAll();

    if(turningOff){
      setDbStatus(`평점 필터 해제 · 현재 선택 조건 업체 ${items().length}곳`,true);
      return;
    }

    // 마커 렌더가 끝난 다음 실제 해당 평점 업체 위치로 이동.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const matchedCount=ratingFilterPlaces(value).length;
    setDbStatus(`${value}★ 평점 업체 ${matchedCount}곳 찾는 중…`);
    await focusRatingFilterResults(value);
  });
});
renderRatingFilterState();

document.querySelectorAll('[data-benefit-filter]').forEach(btn=>{
  btn.addEventListener('click',async ()=>{
    cancelPendingMapWork();
    const value=btn.dataset.benefitFilter;
    const turningOff=state.benefitFilter===value;

    state.benefitFilter=turningOff?'all':value;
    state.selected=null;
    closeSystemInfo();

    renderRatingFilterState();
    renderHierarchyNav();
    renderAll();

    if(turningOff){
      fitSelectedCityView(state.city);
      setDbStatus(`${currentCity().label} 주요정보`,true);
      return;
    }

    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const matchedCount=benefitFilterPlaces(value).length;
    const label=value==='recommended'?'강추업소':'혜택업소';
    setDbStatus(`${label} ${matchedCount}곳 찾는 중…`);
    await focusBenefitFilterResults(value);
  });
});

$('#pName').addEventListener('input',()=>{
  const name=$('#pName').value.trim();
  const address=$('#pAddress').value.trim();
  if(state.clickLatLng && address){
    $('#selectedMapPlace').innerHTML=name
      ? `<b>${esc(name)}</b><br>${esc(address)}`
      : `<b>주소 위치 선택 완료</b><br>${esc(address)}<br><span style="color:#b45309">업체명을 입력해주세요.</span>`;
  }
});
$('#findAddressBtn').addEventListener('click',findAddressLocation);

$('#pAddress').addEventListener('keydown',e=>{
  if(e.key==='Enter' && !e.isComposing){
    e.preventDefault();
    findAddressLocation();
  }
});

// This form isolates venue fields from unrelated map controls for browser
// autofill. Saving still uses the explicit button / Ctrl+Enter flow below.
$('#placeEditorForm').addEventListener('submit',e=>e.preventDefault());

$('#placeModal').addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey) && e.key==='Enter'){
    e.preventDefault();
    savePlace();
  }
});

$('#reviewModal').addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey) && e.key==='Enter'){
    e.preventDefault();
    saveReview();
  }
});

$('#pBenefitEnabled').addEventListener('change',toggleBenefitField);
$('#adminBtn').onclick=toggleAdminMode;
$('#adminCredentialsForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!$('#adminLoginSubmit').disabled)submitAdminPassword();
});
$('#rPhotos').addEventListener('change',handleReviewPhotoSelection);
$('#pPhotos').addEventListener('change',()=>{handlePlacePhotoSelection().catch(err=>{console.error(err);alert(err.message||'사진 처리 중 오류가 발생했습니다.');state.placePhotoProcessing=false;updatePlacePhotoSaveState();});});
$('#pPhotoPreview').addEventListener('click',e=>{
  const btn=e.target.closest('[data-place-photo-kind]');
  if(!btn)return;
  e.preventDefault();
  removePlacePhoto(btn.dataset.placePhotoKind,btn.dataset.placePhotoIndex);
});

$('#addBtn').onclick=()=>{
  closeEditMode();
  cancelRegisterMode();
  $('#registerMethodModal').classList.add('open');
};

$('#registerByMap').onclick=()=>{
  closeModalById('registerMethodModal');
  state.registerMode=true;
  state.registerLookupToken=(state.registerLookupToken||0)+1;
  $('#regHint').textContent='업체 아이콘을 클릭하면 상호명·주소 자동입력 · ESC 취소';
  $('#regHint').classList.add('show');
  $('#addBtn').textContent='지도에서 업체 클릭';
};

$('#registerByAddress').onclick=()=>{
  closeModalById('registerMethodModal');
  state.registerMode=false;
  $('#regHint').classList.remove('show');
  $('#addBtn').textContent='업체 등록';
  state.clickLatLng=null;
  openPlace({addressMode:true});
  setTimeout(()=>$('#pAddress')?.focus(),80);
};

$('#pCat').onchange=fillSubs;
$('#savePlace').onclick=async e=>{
  e?.preventDefault?.();
  try{
    await savePlace();
  }catch(err){
    console.error('savePlace uncaught',err);
    setPlaceSaveStatus(err?.message||'저장 중 오류가 발생했습니다.',false,true);
    setPlaceSaving(false);
    alert(`저장 중 오류가 발생했습니다.\n\n${err?.message||''}`);
  }
};
$('#saveReview').onclick=saveReview;
$('#pAddress').addEventListener('input',invalidateAddressLocation);
$('#searchBtn').onclick=searchMap;
$('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter' && !e.isComposing && !e.defaultPrevented && !window.PlaceSearch)searchMap();});
window.PlaceSearch?.init();
$('#sort').onchange=e=>{state.sort=e.target.value;renderAll()};
$('#locBtn').onclick=locateUser;

document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.preventDefault();
    closeModalById(btn.dataset.close);
  });
});

document.querySelectorAll('.modalback').forEach(modal=>{
  modal.addEventListener('click',e=>{
    if(e.target===modal && !['placeModal','registerMethodModal','reviewModal'].includes(modal.id))closeModalById(modal.id);
  });
});


window.addEventListener('resize',()=>{
  if(!isMobileMapLayout()){
    $('#businessSide')?.classList.remove('mobileOpen');
    $('.mapwrap')?.classList.remove('listOpen');
  }
  refreshMapAfterMobileLayout();
  syncDetailPanelLayout();
  if(state.selected || window.PlaceSearch?.currentPlace())positionSelectedPlaceInView();
});

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(window.NearbyBusinesses?.isPicking()){window.NearbyBusinesses.cancelPick();e.preventDefault();return}
  if(closeTopModalOrRegisterMode()){
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  // Native dialogs keep their own Escape behavior; then dismiss the visible map panel.
  if(document.querySelector('dialog[open]'))return;
  if($('#detail')?.classList.contains('show')){
    if(isMobileMapLayout() && detailExpanded)setDetailExpanded(false);
    else if(window.MapUX)window.MapUX.closeDetail();else closeDetailPanel();
    e.preventDefault();
    return;
  }
  if($('#areaLegendTitle')?.getAttribute('aria-expanded')==='true'){
    setMobileLegendExpanded(false,{restoreFocus:true});
    e.preventDefault();
  }
});


$('#mapRetryBtn')?.addEventListener('click',()=>{
  googleLoadAttempt=0;
  loadGoogle({force:true}).catch(()=>{});
});

bindAreaNavigation();
renderCats();
renderList();

// 모바일/PC 모두 공용 DB를 먼저 읽는다. Google Maps 로딩과 독립적이다.
bindAdminSessionEvents();
restoreAdminSession();
bootstrapSharedDb().catch(()=>{});
loadGoogle().catch(()=>{});
