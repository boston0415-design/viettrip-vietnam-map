function renderMarkers(){
  state.markers.forEach(m=>m.setMap(null));state.markers=[];
  clearPremiumEffects();
  if(!state.map)return;
  items().forEach(p=>{
    if(!validMapLocation(p))return;
    const st=stats(p.id);
    const m=new google.maps.Marker({
      map:state.map,
      position:{lat:Number(p.lat),lng:Number(p.lng)},
      title:`${p.name}${st.rating==null?'':` · ${st.rating.toFixed(1)}점`}`,
      zIndex:150,
      icon:businessMarkerIcon(p.category,p.subcategory)
    });
    bindMapFeatureInfo(m,{...p,type:`${catLabel(p.category)} · ${p.subcategory||''}${st.rating==null?'':` · ${st.rating.toFixed(1)}점`}`},{lat:Number(p.lat),lng:Number(p.lng)},null,{click:false});
    m.addListener('click',async ()=>{
      if(window.NearbyBusinesses?.handleMapClick({latLng:{lat:Number(p.lat),lng:Number(p.lng)}}))return;
      cancelPendingMapWork();
      await selectPlace(p.id,true,false);
    });
    m._placeId=p.id;
    state.markers.push(m);
  });

  // Member places keep category colors; ratings remain in lists and information cards.
  clearPremiumEffects();
}

async function verifyAdminKey(key){
  try{
    const ok=await supaRpc('admin_verify',{p_admin_key:key});
    return ok===true;
  }catch(err){
    console.error('admin verify failed',err);
    return null;
  }
}

let adminSessionRevision=0;
function syncAdminButton(){
  const button=$('#adminBtn');
  if(!button)return;
  button.textContent=state.isAdmin||adminKey()?'관리자 로그아웃':'관리자';
  button.classList.toggle('adminOn',state.isAdmin);
}
function clearAdminSession(){
  adminSessionRevision++;
  saveAdminKey('');
  state.isAdmin=false;
  syncAdminButton();
  renderDetail();
}

async function toggleAdminMode(){
  if(state.isAdmin||adminKey()){
    clearAdminSession();
    return;
  }

  $('#adminPassword').value='';
  $('#adminLoginStatus').textContent='로그아웃하기 전까지 이 브라우저에서 로그인을 유지합니다.';
  $('#adminLoginStatus').style.color='#64748b';
  $('#adminLoginModal').classList.add('open');
  setTimeout(()=>$('#adminPassword')?.focus(),60);
}

async function submitAdminPassword(){
  const input=$('#adminPassword');
  const key=(input?.value||'').trim();
  if(!key){
    $('#adminLoginStatus').textContent='비밀번호를 입력하세요.';
    $('#adminLoginStatus').style.color='#dc2626';
    input?.focus();
    return;
  }

  $('#adminLoginSubmit').disabled=true;
  $('#adminLoginStatus').textContent='확인 중…';
  $('#adminLoginStatus').style.color='#64748b';

  const revision=++adminSessionRevision;
  const ok=await verifyAdminKey(key);
  $('#adminLoginSubmit').disabled=false;
  if(revision!==adminSessionRevision)return;

  if(ok===null){
    $('#adminLoginStatus').textContent='서버에 연결하지 못했습니다. 연결 후 다시 확인해 주세요.';
    $('#adminLoginStatus').style.color='#dc2626';
    return;
  }

  if(!ok){
    $('#adminLoginStatus').textContent='비밀번호가 올바르지 않습니다.';
    $('#adminLoginStatus').style.color='#dc2626';
    input.value='';
    input.focus();
    return;
  }

  saveAdminKey(key);
  input.value='';
  state.isAdmin=true;
  syncAdminButton();
  $('#adminLoginModal').classList.remove('open');
  renderDetail();
}

async function restoreAdminSession(){
  const revision=++adminSessionRevision;
  const key=adminKey();
  syncAdminButton();
  if(!key){
    state.isAdmin=false;
    syncAdminButton();
    renderDetail();
    return;
  }
  const ok=await verifyAdminKey(key);
  // A late verification must never undo logout or a newer login in another tab.
  if(revision!==adminSessionRevision||key!==adminKey())return;
  if(ok===true){
    saveAdminKey(key);
    state.isAdmin=true;
    syncAdminButton();
    renderDetail();
  }else if(ok===false){
    clearAdminSession();
  }
}

function bindAdminSessionEvents(){
  window.addEventListener('storage',event=>{
    if(event.key!==ADMIN_KEY_STORAGE_KEY&&event.key!==null)return;
    memoryStorage.delete(ADMIN_KEY_STORAGE_KEY);
    safeSessionRemove(ADMIN_KEY_STORAGE_KEY);
    state.isAdmin=false;
    syncAdminButton();
    renderDetail();
    restoreAdminSession();
  });
  const retry=()=>{
    if(!state.isAdmin&&adminKey())restoreAdminSession();
  };
  window.addEventListener('online',retry);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')retry();
  });
}

function openEditPlace(place,mode){
  if(!place)return;
  state.editPlaceId=place.id;
  state.editMode=mode;
  state.clickLatLng={lat:Number(place.lat),lng:Number(place.lng)};

  openPlace({
    name:place.name,
    registrantNickname:place.registrantNickname,
    category:place.category,
    subcategory:place.subcategory,
    area:place.area,
    address:place.address,
    description:place.description,
    memberBenefit:place.memberBenefit,
    benefitText:place.benefitText,
    photoUrls:place.photoUrls||[],
    tags:place.tags||[],
    initialRating:place.initialRating,
    latLng:state.clickLatLng
  });

  $('#placeModalTitle').textContent=mode==='admin'?'업체 수정 · 관리자':'내가 등록한 업체 수정';
  state.placeSaveInProgress=false;
  state.placePhotoProcessing=false;
  $('#savePlace').disabled=false;
  $('#savePlace').textContent='수정 저장';
  setPlaceSaveStatus('');
  $('#selectedMapPlace').innerHTML='<b>기존 위치</b><br>주소나 지도 위치를 변경하면 새 위치로 저장됩니다.';
}

function closeEditMode(){
  state.editPlaceId=null;
  state.editMode=null;
  if($('#placeModalTitle'))$('#placeModalTitle').textContent='업체 등록';
  if($('#savePlace'))$('#savePlace').textContent='등록';
}

async function requestOwnerDelete(placeId){
  const p=db().places.find(x=>x.id===placeId);
  if(!p || !isOwnerPlace(p)){
    alert('이 업체를 등록한 기기에서만 삭제 요청할 수 있습니다.');
    return;
  }
  if(!confirm('삭제 요청을 보낼까요? 관리자가 확인 후 삭제할 수 있습니다.'))return;

  try{
    const ok=await supaRpc('owner_request_place_delete',{
      p_place_id:placeId,
      p_owner_key:getDeviceId()
    });
    if(!ok){alert('삭제 요청 권한을 확인하지 못했습니다.');return}
    const shared=await fetchSharedDb();
    forgetOwnedPlace(placeId);
    saveDb(shared);
    renderAll();
    alert('삭제 요청을 보냈습니다.');
  }catch(err){
    console.error(err);
    alert('삭제 요청 중 오류가 발생했습니다.');
  }
}

async function adminDeletePlace(placeId){
  if(!state.isAdmin)return;
  const p=db().places.find(x=>x.id===placeId);
  if(!p)return;
  if(!confirm(`"${p.name}" 업체를 완전히 삭제할까요?\n등록된 후기도 함께 삭제됩니다.`))return;

  try{
    const ok=await supaRpc('admin_delete_place',{
      p_admin_key:adminKey(),
      p_place_id:placeId
    });
    if(!ok){alert('관리자 권한을 확인하지 못했습니다.');return}
    state.selected=null;
    const shared=await fetchSharedDb();
    saveDb(shared);
    renderAll();
    alert('삭제했습니다.');
  }catch(err){
    console.error(err);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

async function adminClearDeleteRequest(placeId){
  if(!state.isAdmin)return;
  try{
    const ok=await supaRpc('admin_update_place',{
      p_admin_key:adminKey(),
      p_place_id:placeId,
      p_patch:{delete_requested:false}
    });
    if(!ok)return;
    const shared=await fetchSharedDb();
    saveDb(shared);
    renderAll();
  }catch(err){
    console.error(err);
  }
}



function encodeCopyValue(text){
  return encodeURIComponent(String(text||''));
}

// Maps URLs use the device location in Google Maps when origin is omitted.
// No Directions/Routes API call, stored origin, or background location tracking.
function businessDirectionsUrl(place,{travelmode}={}){
  if(!place)return '';
  const present=value=>value!==null && value!==undefined && String(value).trim()!=='';
  const lat=Number(place.lat),lng=Number(place.lng);
  const hasCoordinates=present(place.lat)&&present(place.lng)&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const destination=hasCoordinates?`${lat},${lng}`:[place.name,place.address].filter(present).join(' ').trim().slice(0,200);
  if(!destination)return '';
  const mode=['walking','driving','transit','bicycling','two-wheeler'].includes(travelmode)?`&travelmode=${travelmode}`:'';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&dir_action=navigate${mode}`;
}

function businessDirectionsLinkHtml(place,compact=false){
  const url=businessDirectionsUrl(place);
  if(!url)return '';
  return `<a class="directionsButton${compact?'':' copyBtn'}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(place.name||'선택한 업체')} 현재 위치에서 길찾기 · 구글 지도 새 창" title="구글 지도에서 현재 위치를 허용하고 이동 수단을 선택하세요"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-8a4 4 0 0 1 4-4h10M14 3l5 5-5 5"/></svg><span>길찾기</span></a>`;
}

function copyButtonHtml(label,text){
  if(!text)return '';
  return `<button type="button" class="copyBtn" data-copy-value="${encodeCopyValue(text)}" onclick="return handleCopyButton(event,this)">${esc(label)}</button>`;
}

function fallbackCopyText(value){
  const active=document.activeElement;
  const selection=document.getSelection();
  const oldRanges=[];

  if(selection){
    for(let i=0;i<selection.rangeCount;i++)oldRanges.push(selection.getRangeAt(i));
  }

  const ta=document.createElement('textarea');
  ta.value=value;
  ta.setAttribute('readonly','');
  ta.setAttribute('aria-hidden','true');
  ta.style.position='fixed';
  ta.style.left='-9999px';
  ta.style.top='0';
  ta.style.opacity='0';
  ta.style.pointerEvents='none';
  ta.style.fontSize='16px';
  document.body.appendChild(ta);

  ta.focus({preventScroll:true});
  ta.select();
  ta.setSelectionRange(0,ta.value.length);

  let ok=false;
  try{
    ok=document.execCommand('copy')===true;
  }catch(err){
    console.warn('fallback copy failed',err);
  }

  ta.remove();

  if(active?.focus){
    try{active.focus({preventScroll:true})}catch(e){active.focus()}
  }

  if(selection){
    selection.removeAllRanges();
    oldRanges.forEach(r=>selection.addRange(r));
  }

  return ok;
}

async function copyTextToClipboard(text,button=null){
  const value=String(text||'').trim();
  if(!value)return false;

  let copied=false;

  if(navigator.clipboard && window.isSecureContext){
    try{
      await navigator.clipboard.writeText(value);
      copied=true;
    }catch(err){
      console.warn('Clipboard API failed; trying fallback.',err);
    }
  }

  if(!copied){
    copied=fallbackCopyText(value);
  }

  if(!copied){
    // 최후의 수단: 사용자가 직접 복사할 수 있게 텍스트를 노출
    window.prompt('아래 내용을 복사하세요.',value);
    return false;
  }

  if(button){
    const original=button.dataset.originalLabel||button.textContent;
    button.dataset.originalLabel=original;
    button.classList.add('copied');
    button.textContent='복사됨 ✓';
    clearTimeout(button._copyTimer);
    button._copyTimer=setTimeout(()=>{
      button.classList.remove('copied');
      button.textContent=original;
    },1100);
  }

  return true;
}

function handleCopyButton(event,button){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();

  let value='';
  try{
    value=decodeURIComponent(button?.dataset?.copyValue||'');
  }catch(err){
    value=button?.dataset?.copyValue||'';
  }

  copyTextToClipboard(value,button);
  return false;
}
window.handleCopyButton=handleCopyButton;



function openOwnedPlaceEditor(placeId){
  const place=db().places.find(x=>x.id===placeId);
  if(!place)return;
  const owner=isOwnerPlace(place);
  if(!owner && !state.isAdmin){
    alert('이 업체는 등록한 기기나 관리자만 수정할 수 있습니다.');
    return;
  }
  state.selected=placeId;
  renderDetail();
  openEditPlace(place, state.isAdmin ? 'admin' : 'owner');
}
window.openOwnedPlaceEditor=openOwnedPlaceEditor;


// The mobile sheet starts with a summary; opening it never changes map filters.
let detailExpanded=false;
let detailPlaceId=null;
let detailPositionFrame=0;

function positionSelectedPlaceInView(){
  const version=++detailPositionFrame;
  requestAnimationFrame(()=>{
    if(version!==detailPositionFrame || !state.map || !state.selected)return;
    const place=db().places.find(p=>p.id===state.selected);
    const panel=$('#detail'),mapElement=$('.mapwrap');
    if(!place || !panel?.classList.contains('show') || !mapElement)return;
    const mapRect=mapElement.getBoundingClientRect(),panelRect=panel.getBoundingClientRect();
    if(!mapRect.width || !mapRect.height || !panelRect.height)return;
    const position={lat:Number(place.lat),lng:Number(place.lng)};
    if(!Number.isFinite(position.lat)||!Number.isFinite(position.lng))return;
    // Pan into the visible part of the map, including phone landscape and desktop.
    const sidePanel=panelRect.width<mapRect.width*.7;
    const x=sidePanel?Math.max(0,(mapRect.right-panelRect.left)/2):0;
    const y=sidePanel?0:Math.max(0,(mapRect.bottom-panelRect.top-40)/2);
    state.map.setCenter(position);
    if(typeof state.map.panBy==='function')state.map.panBy(Math.round(x),Math.round(y));
  });
}

function syncDetailPanelLayout(){
  const panel=$('#detail');
  if(!panel?.classList.contains('show'))return;
  const expanded=!isMobileMapLayout() || detailExpanded;
  panel.classList.toggle('detailExpanded',expanded);
  const body=$('#detailBody'),toggle=$('#detailExpandBtn');
  if(body)body.hidden=!expanded;
  if(toggle){
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.textContent=expanded?'지도보기 ▾':'상세보기 ▴';
  }
  $('.mapwrap')?.classList.add('detailOpen');
  if(typeof syncGooglePlacePhotos==='function')syncGooglePlacePhotos();
  window.DetailSheetResize?.sync();
}

function setDetailExpanded(expanded){
  window.DetailSheetResize?.reset();
  detailExpanded=Boolean(expanded);
  const body=$('#detailBody');
  if(!detailExpanded && body?.contains(document.activeElement))$('#detailExpandBtn')?.focus({preventScroll:true});
  syncDetailPanelLayout();
  positionSelectedPlaceInView();
}

function closeDetailPanel(){
  window.DetailSheetResize?.reset();
  if(typeof clearGooglePlacePhotos==='function')clearGooglePlacePhotos();
  detailExpanded=false;
  detailPlaceId=null;
  detailPositionFrame++;
  state.selected=null;
  const d=$('#detail');
  if(d)d.classList.remove('show');
  $('.mapwrap')?.classList.remove('detailOpen');
  renderList();
  closeSystemInfo();
  refreshMapAfterMobileLayout();
}

function renderDetail(){
  const p=db().places.find(x=>x.id===state.selected);const d=$('#detail');
  if(!p){
    if(typeof clearGooglePlacePhotos==='function')clearGooglePlacePhotos();
    d.classList.remove('show');
    $('.mapwrap')?.classList.remove('detailOpen');
    return;
  }
  if(detailPlaceId!==p.id){window.DetailSheetResize?.reset();detailExpanded=false;detailPlaceId=p.id;d.scrollTop=0;}
  const st=stats(p.id);
  const owner=isOwnerPlace(p);
  const canEdit=owner||state.isAdmin;
  const management=canEdit
    ? `<div class="manageRow">
        <button id="editPlaceBtn" class="btn">${state.isAdmin?'관리자 수정':'내 업체 수정 · 사진추가'}</button>
        ${owner&&!state.isAdmin?'<button id="requestDeleteBtn" class="btn danger">삭제 요청</button>':''}
        ${state.isAdmin?'<button id="adminDeleteBtn" class="btn danger">관리자 삭제</button>':''}
        ${state.isAdmin&&p.deleteRequested?'<button id="clearDeleteRequestBtn" class="btn">삭제요청 해제</button>':''}
      </div>
      <div class="ownerNote">${state.isAdmin?'관리자 권한으로 모든 업체의 정보·사진 수정 및 삭제가 가능합니다.':'이 업체를 등록한 기기이므로 이름, 분류, 주소, 설명, 혜택, 사진을 직접 수정할 수 있습니다.'}</div>`
    : '';

  const combinedCopy=[p.name,p.address].filter(Boolean).join('\n');
  const booking=typeof bookingLinkHtml==='function'?bookingLinkHtml(p):'';
  const bookingNote=booking && typeof bookingNoteHtml==='function'?bookingNoteHtml(p):'';

  d.classList.add('show');
  $('.mapwrap')?.classList.add('detailOpen');
  d.innerHTML=`<div class="detailHeader"><div class="detailTitleWrap"><h2><button type="button" class="businessReviewName" data-place-reviews="${esc(p.id)}"><span class="detailName">${esc(p.name)}</span><span class="reviewNameHint">회원 후기 ${st.reviews.length}개 보기 ›</span></button></h2></div><button id="detailCloseBtn" class="detailClose" type="button" aria-label="상세 닫기">×</button></div>
  <div class="detailSummary">
    <div class="detailSummaryMeta"><span>${catLabel(p.category)}${p.subcategory?' · '+esc(p.subcategory):''}</span><span class="detailSummaryRating">${st.rating==null?'평가 없음':`★ ${st.rating.toFixed(1)} <small>(${st.count})</small>`}</span></div>
    ${p.address?`<p class="detailSummaryAddress" title="${esc(p.address)}">${esc(p.address)}</p>`:''}
  </div>
  <div class="detailQuickActions${booking?' hasBooking':''}">
    <button type="button" id="detailExpandBtn" aria-expanded="false" aria-controls="detailBody">상세보기 ▴</button>
    ${businessDirectionsLinkHtml(p,true)}
    <button type="button" class="grabButton" data-grab-place="${esc(p.id)}">그랩으로 이동</button>
    ${booking}
  </div>
  <div id="detailBody" class="detailBody">
  <div class="copyRow">
    ${businessDirectionsLinkHtml(p)}
    ${booking}
    ${copyButtonHtml('업체명 복사',p.name)}
    ${p.address?copyButtonHtml('주소 복사',p.address):''}
    <button type="button" class="copyBtn grabButton" data-grab-place="${esc(p.id)}">그랩으로 이동</button>
    ${p.address?copyButtonHtml('이름+주소 복사',combinedCopy):''}
  </div>
  ${bookingNote}
  ${p.registrantNickname?`<p class="placeRegistrant">등록자 <span>${esc(p.registrantNickname)}</span></p>`:''}
  ${(p.photoUrls||[]).length?`<div class="placePhotos">${p.photoUrls.slice(0,5).map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" loading="lazy" alt="${esc(p.name)} 업체 사진"></a>`).join('')}</div>`:''}
  <div id="googlePlacePhotoSlot"></div>
  <div class="badges"><span class="badge main">${businessGlyph(p.category,p.subcategory)} ${catLabel(p.category)}</span><span class="badge">${esc(p.category==='restaurant'?normalizedRestaurantSub(p.subcategory):p.subcategory)}</span>${restaurantTagsHtml(p)}${recommendationBadges(p)}${owner?'<span class="badge">내가 등록</span>':''}${benefitInlineBadgeHtml(p)}${p.deleteRequested?'<span class="badge deleteRequest">삭제요청</span>':''}</div><div class="desc">${esc(p.address||'')}<br>${esc(p.description||'')}</div>${p.memberBenefit?`<div class="benefitRow"><strong>${benefitInfoLabel(p)}</strong><div class="benefitText">${esc(p.benefitText||'카페 회원 전용 혜택 제공')}</div></div>`:''}<div class="scorebox"><div><div class="scorebig">${st.rating==null?'—':st.rating.toFixed(1)}</div><div style="font-size:11px;color:#6b7280">우리 회원 평균</div></div><div style="font-size:12px;color:#6b7280">평가 ${st.count}개</div></div>${management}<button id="writeReview" class="btn primary">${owner||db().reviews.some(r=>r.placeId===p.id&&isOwnReview(r))?'내 별점·후기 수정':'별점·후기 남기기'}</button><div style="margin-top:12px">${st.reviews.length?st.reviews.map(r=>`<div class="review"><div class="reviewtop"><span>${esc(r.nickname)}</span>${r.recommended?'<span class="badge recommendationBadge">👍 강추</span>':''}${r.rating==null?'':`<span>★ ${r.rating}</span>`}</div><div class="reviewtxt">${esc(r.text)}</div>${normalizeCafeReviewUrl(r.cafeUrl)?`<a class="cafeOriginalLink" href="${esc(normalizeCafeReviewUrl(r.cafeUrl))}" target="_blank" rel="noopener noreferrer">카페 후기 원문 보기 ↗</a>`:''}${(r.photoUrls||[]).length?`<div class="reviewPhotos">${r.photoUrls.slice(0,3).map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" loading="lazy" alt="회원 후기 사진"></a>`).join('')}</div>`:''}</div>`).join(''):'<div class="empty">아직 회원 후기가 없습니다.</div>'}</div></div>`;

  syncDetailPanelLayout();
  $('#detailExpandBtn').onclick=()=>setDetailExpanded(!detailExpanded);
  if($('#detailCloseBtn')) $('#detailCloseBtn').onclick=()=>closeDetailPanel();
  $('#writeReview').onclick=()=>openReview();
  if($('#editPlaceBtn')) $('#editPlaceBtn').onclick=()=>openEditPlace(p,state.isAdmin?'admin':'owner');
  if($('#requestDeleteBtn')) $('#requestDeleteBtn').onclick=()=>requestOwnerDelete(p.id);
  if($('#adminDeleteBtn')) $('#adminDeleteBtn').onclick=()=>adminDeletePlace(p.id);
  if($('#clearDeleteRequestBtn')) $('#clearDeleteRequestBtn').onclick=()=>adminClearDeleteRequest(p.id);
}
function renderAll(){renderCats();renderList();renderMarkers();refreshRegisteredCoverage();renderDetail();if(typeof syncMapFilterSummary==='function')syncMapFilterSummary();window.NearbyBusinesses?.sync()}
async function selectPlace(id,pan=true,showInfo=false){
  closeSystemInfo();
  closeAreaPanel();
  setMobileLegendExpanded(false);
  if(isMobileMapLayout())closeMobileBusinessList();
  state.selected=id;
  renderList();
  renderDetail();

  const p=db().places.find(x=>x.id===id);
  if(!p || !state.map)return;

  const pos={lat:Number(p.lat),lng:Number(p.lng)};

  if(pan){
    cancelPendingMapWork();
    await focusLocationAtZoom(pos,17);
    if(state.selected===id)positionSelectedPlaceInView();
  }
  // 업체 선택 시에는 오른쪽 상세패널만 보여주고, 지도 팝업은 띄우지 않는다.
  // 중복 정보가 겹쳐 보이는 문제를 방지하기 위한 통일 동작이다.
}

function toggleBenefitField(){
  const on=$('#pBenefitEnabled').checked;
  $('#benefitField').classList.toggle('hiddenField', !on);
}

function renderPlaceStars(){
  $('#placeStars').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" class="star ${n<=state.newPlaceRating?'on':''}" data-pstar="${n}">★</button>`).join('');
  document.querySelectorAll('[data-pstar]').forEach(b=>b.onclick=()=>{state.newPlaceRating=Number(b.dataset.pstar);renderPlaceStars()});
}

function inferCategory(name='',types=[]){
  const n=name.toLowerCase();
  const t=new Set(types||[]);
  const officeType=Object.keys(PUBLIC_OFFICE_PLACE_TYPES).find(type=>t.has(type));
  if(officeType){
    const officeName=n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
    const immigration=['police','local_government_office'].includes(officeType) && /출입국|\bimmigration\b|\bxuat nhap canh\b/.test(officeName);
    return ['public_office',immigration?'출입국관리':PUBLIC_OFFICE_PLACE_TYPES[officeType]];
  }
  if(t.has('pharmacy')||t.has('drugstore')) return ['pharmacy','약국'];
  if(t.has('veterinary_care')) return ['hospital','동물병원'];
  if(t.has('dentist')) return ['hospital','치과'];
  if(t.has('hospital')||t.has('doctor')) return ['hospital','종합병원·일반진료'];
  if(t.has('lodging')) return ['stay','호텔'];
  const hairName=n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
  if(t.has('barber_shop') || /이발소|\bbarber(?:shop|s)?\b|\b(?:hot|cat) toc\b/.test(hairName)) return ['barber','이발소'];
  if(t.has('hair_salon') || t.has('hair_care') || /미용실|\bhair[ -]?salon\b/.test(hairName)) return ['barber','미용실'];
  if(t.has('spa')) return ['spa','스파'];
  if(t.has('night_club')) return ['bar','클럽'];
  if(t.has('golf_course') || n.includes('golf')) return ['golf','골프장'];
  if(t.has('supermarket')||t.has('grocery_store')) return ['shopping','마트'];
  if(t.has('shopping_mall')) return ['shopping','쇼핑몰'];
  if(t.has('fruit_and_vegetable_store')) return ['shopping','과일가게'];
  if(t.has('juice_shop') || /\b(?:fruit|fruits|juice)\b|과일|주스/.test(n)) return ['cafe','과일·주스'];
  if(t.has('bakery') || /\bbakery\b|베이커리|파리바게트/.test(n)) return ['cafe','베이커리'];
  if(t.has('dessert_shop')||t.has('ice_cream_shop')) return ['cafe','디저트'];
  if(n.includes('market') || n.includes('chợ') || n.includes('cho ') || n.includes('night market')) return ['market',n.includes('night')?'야시장':'전통시장'];
  const heritageName=n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').normalize('NFC').trim().replace(/\s+/g,' ');
  // Match the palace's known names, without treating every hotel named "Palace" as a relic.
  const independencePalace=/^(?:통일궁|독립궁|(?:the )?(?:independence|reunification) palace|dinh doc lap)(?:$|\s*[（(])/.test(heritageName);
  if(t.has('historical_landmark') || t.has('historical_place') || independencePalace) return ['attraction','역사·문화유적'];
  if(t.has('park')) return ['attraction','공원'];
  if(t.has('tourist_attraction') || n.includes('beach') || n.includes('square')) return ['attraction',n.includes('beach')?'해변':'랜드마크'];
  if(t.has('cafe')) return ['cafe','카페'];
  if(t.has('bar')) return ['bar','펍'];
  if(n.includes('karaoke') || n.includes('ktv')) return ['karaoke','한인 가라오케'];
  if(n.includes('japanese') || n.includes('yakiniku') || n.includes('sushi') || n.includes('ramen') || n.includes('izakaya')) return ['restaurant','일식'];
  if(n.includes('korean') || n.includes('samgyeop') || n.includes('galbi')) return ['restaurant','한식'];
  if(n.includes('chinese') || n.includes('dim sum')) return ['restaurant','중식'];
  if(
    n.includes('pizza') || n.includes('pasta') || n.includes('steak') ||
    n.includes('italian') || n.includes('french') || n.includes('bistro') ||
    n.includes('western') || n.includes('burger') || n.includes('brasserie')
  ) return ['restaurant','양식'];
  if(t.has('restaurant') || t.has('food')) return ['restaurant','베트남'];
  return ['restaurant','베트남 로컬'];
}

function setPlaceCategory(category,subcategory){
  $('#pCat').value=CONFIG.categories[category]?category:'restaurant';
  fillSubs();
  if([...$('#pSub').options].some(o=>o.value===subcategory || o.text===subcategory)) $('#pSub').value=subcategory;
}


function clearAddressSearchMarker(){
  if(state.addressSearchMarker){
    state.addressSearchMarker.setMap(null);
    state.addressSearchMarker=null;
  }
}

function resetReviewDraftUi(){
  revokeReviewPreviewUrls();
  state.reviewNewFiles=[];
  state.reviewExistingPhotos=[];
  if($('#rPhotos'))$('#rPhotos').value='';
  if($('#rPhotoPreview'))$('#rPhotoPreview').innerHTML='';
}

function closeModalById(id){
  const modal=document.getElementById(id);
  if(!modal)return;

  modal.classList.remove('open');

  if(id==='placeModal'){
    if(!state.editPlaceId)rememberMemberNickname($('#pNickname').value);
    clearAddressSearchMarker();
    resetPlacePhotoDraftUi();
    closeEditMode();
    state.clickLatLng=null;
    cancelRegisterMode();
  }else if(id==='registerMethodModal'){
    cancelRegisterMode();
  }else if(id==='reviewModal'){
    resetReviewDraftUi();
  }else if(id==='adminLoginModal'){
    if($('#adminPassword'))$('#adminPassword').value='';
    if($('#adminLoginStatus')){
      $('#adminLoginStatus').textContent='';
      $('#adminLoginStatus').style.color='#64748b';
    }
  }
}

function closeTopModalOrRegisterMode(){
  const open=[...document.querySelectorAll('.modalback.open')];
  if(open.length){
    closeModalById(open[open.length-1].id);
    return true;
  }

  if(state.registerMode){
    cancelRegisterMode();
    setDbStatus('업체 등록 취소');
    return true;
  }

  return false;
}

function cancelRegisterMode(){
  state.registerMode=false;
  state.registerLookupToken=(state.registerLookupToken||0)+1;
  $('#regHint').classList.remove('show');
  $('#regHint').textContent='등록할 업체 아이콘을 지도에서 클릭하세요';
  $('#addBtn').textContent='업체 등록';
}

function openPlace(prefill={}){
  fillAdmin();
  state.newPlaceRating=prefill.initialRating!=null&&Number.isFinite(Number(prefill.initialRating))?Number(prefill.initialRating):5;
  renderPlaceStars();

  if(!state.editPlaceId){
    $('#placeModalTitle').textContent='업체 등록';
    state.placeSaveInProgress=false;
    state.placePhotoProcessing=false;
    $('#savePlace').disabled=false;
    $('#savePlace').textContent='등록';
    setPlaceSaveStatus('');
  }

  if(prefill.addressMode){
    state.clickLatLng=null;
  }
  const pos=prefill.addressMode ? null : (prefill.latLng || state.clickLatLng || state.map?.getCenter());
  if(pos){
    state.clickLatLng = typeof pos.lat==='function' ? {lat:pos.lat(),lng:pos.lng()} : {lat:Number(pos.lat),lng:Number(pos.lng)};
  }

  const editing=Boolean(state.editPlaceId);
  $('#pNickname').value=editing?(prefill.registrantNickname||''):rememberedMemberNickname();
  $('#pNickname').required=!editing;
  $('#pNickname').readOnly=editing;
  $('#pNickname').placeholder=editing?'닉네임 미등록':'카페에서 사용하는 닉네임을 적어주세요';
  $('#pNickname').removeAttribute('aria-invalid');
  $('#pNicknameLabel').textContent=editing?'등록자 닉네임':'등록자 닉네임 · 필수';
  $('#pNicknameHelp').textContent=editing
    ? (prefill.registrantNickname?'등록 당시 닉네임입니다. 업체 정보를 수정해도 유지됩니다.':'기존 등록에는 닉네임이 저장되지 않았습니다.')
    : REGISTRANT_NICKNAME_HELP;
  bindRememberedNicknameInput($('#pNickname'));
  $('#pName').value=prefill.name||'';
  const registrationCity=state.city==='all'?CITY_DATA[nearestCityKeyForLatLng(state.clickLatLng?.lat,state.clickLatLng?.lng)]:currentCity();
  $('#pArea').value=prefill.area||registrationCity?.label||'';
  $('#pAddress').value=prefill.address||'';
  $('#pDesc').value=prefill.description||'';
  if($('#addressLookupStatus')) $('#addressLookupStatus').textContent=prefill.addressMode
    ? '주소를 입력한 뒤 「주소로 위치 찾기」를 눌러주세요.'
    : (prefill.address?'지도에서 선택한 업체 주소입니다.':'지도에서 업체를 클릭하거나 주소를 입력해 위치를 찾을 수 있습니다.');
  $('#pBenefitEnabled').checked=!!prefill.memberBenefit;
  $('#pRecommended').checked=!!prefill.tags?.includes('강추업소');
  $('#pBenefitText').value=prefill.benefitText||'';
  toggleBenefitField();

  revokePlacePreviewUrls();
  state.placeExistingPhotos=[...(prefill.photoUrls||[])].slice(0,5);
  state.placeNewFiles=[];
  if($('#pPhotos'))$('#pPhotos').value='';
  renderPlacePhotoPreview();

  const [cat,sub]=inferCategory(prefill.name||'',prefill.types||[]);
  const resolvedCategory=prefill.category||cat;
  const resolvedSub=resolvedCategory==='restaurant'
    ? normalizedRestaurantSub(prefill.subcategory||sub)
    : (prefill.subcategory||sub);
  setPlaceCategory(resolvedCategory,resolvedSub);
  renderRestaurantTagChoices(
    prefill.tags || (resolvedCategory==='restaurant' ? inferRestaurantTags(prefill.name||'') : [])
  );

  const loc=state.clickLatLng;
  $('#selectedMapPlace').innerHTML=loc
    ? `<b>지도 위치 선택 완료</b><br>${prefill.name?esc(prefill.name)+'<br>':''}${prefill.address?esc(prefill.address):'선택한 지도 위치에 등록됩니다.'}`
    : (prefill.addressMode?'주소를 입력해 위치를 찾아주세요.':'지도에서 업체 위치를 선택해주세요.');

  $('#placeModal').classList.add('open');
  initAddressAutocomplete();
  cancelRegisterMode();
}


function getGooglePlaceDetails(placeId){
  return new Promise(resolve=>{
    if(!placeId || !state.map || !google.maps.places?.PlacesService){
      resolve(null);
      return;
    }

    const svc=new google.maps.places.PlacesService(state.map);
    svc.getDetails({
      placeId,
      fields:['place_id','name','formatted_address','geometry','types']
    },(place,status)=>{
      resolve(
        status===google.maps.places.PlacesServiceStatus.OK && place
          ? place
          : null
      );
    });
  });
}
