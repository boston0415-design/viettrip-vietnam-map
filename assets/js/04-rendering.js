function renderMarkers(){
  state.markers.forEach(m=>m.setMap(null));state.markers=[];
  clearPremiumEffects();
  if(!state.map)return;
  items().forEach(p=>{
    const st=stats(p.id);
    const m=new google.maps.Marker({
      map:state.map,
      position:{lat:Number(p.lat),lng:Number(p.lng)},
      title:`${p.name}${st.rating==null?'':` · ${st.rating.toFixed(1)}점`}`,
      zIndex:150,
      icon:businessMarkerIcon(p.category,p.subcategory,st.rating,!!p.memberBenefit,p.benefitText||'')
    });
    m.addListener('mouseover',()=>{
      const benefit=p.memberBenefit?`<div style="margin-top:5px;color:#0b8f52;font-size:11px;font-weight:800">회원혜택 · ${esc(p.benefitText||'카페 회원 전용 혜택')}</div>`:'';
      showHover(m,infoHtml(
        p.name,
        `${catLabel(p.category)} · ${p.subcategory}${st.rating==null?'':` · ${st.rating.toFixed(1)}점`}`,
        p.address||p.description||'',
        benefit
      ));
    });
    m.addListener('mouseout',hideHover);
    m.addListener('click',async ()=>{
      cancelPendingMapWork();
      await selectPlace(p.id,true,false);
    });
    m._placeId=p.id;
    state.markers.push(m);
  });

  // 4.5+ 업체도 업종 색상을 그대로 유지한다.
  // 평점 차이는 숫자 배지만으로 표시하고 별도 금색 링/펄스는 사용하지 않는다.
  clearPremiumEffects();
}

async function verifyAdminKey(key){
  try{
    const ok=await supaRpc('admin_verify',{p_admin_key:key});
    return ok===true;
  }catch(err){
    console.error('admin verify failed',err);
    return false;
  }
}

async function toggleAdminMode(){
  if(state.isAdmin){
    state.isAdmin=false;
    safeSessionRemove('viettrip_admin_key_v1');
    $('#adminBtn').textContent='관리자';
    $('#adminBtn').classList.remove('adminOn');
    renderDetail();
    return;
  }

  $('#adminPassword').value='';
  $('#adminLoginStatus').textContent='비밀번호만 입력하면 관리자 모드로 전환됩니다.';
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

  const ok=await verifyAdminKey(key);
  $('#adminLoginSubmit').disabled=false;

  if(!ok){
    $('#adminLoginStatus').textContent='비밀번호가 올바르지 않습니다.';
    $('#adminLoginStatus').style.color='#dc2626';
    input.value='';
    input.focus();
    return;
  }

  safeSessionSet('viettrip_admin_key_v1',key);
  state.isAdmin=true;
  $('#adminBtn').textContent='관리자 ON';
  $('#adminBtn').classList.add('adminOn');
  $('#adminLoginModal').classList.remove('open');
  renderDetail();
}

async function restoreAdminSession(){
  const key=adminKey();
  if(!key)return;
  if(await verifyAdminKey(key)){
    state.isAdmin=true;
    if($('#adminBtn')){
      $('#adminBtn').textContent='관리자 ON';
      $('#adminBtn').classList.add('adminOn');
    }
    renderDetail();
  }else{
    safeSessionRemove('viettrip_admin_key_v1');
  }
}

function openEditPlace(place,mode){
  if(!place)return;
  state.editPlaceId=place.id;
  state.editMode=mode;
  state.clickLatLng={lat:Number(place.lat),lng:Number(place.lng)};

  openPlace({
    name:place.name,
    category:place.category,
    subcategory:place.subcategory,
    area:place.area,
    address:place.address,
    description:place.description,
    memberBenefit:place.memberBenefit,
    benefitText:place.benefitText,
    photoUrls:place.photoUrls||[],
    tags:restaurantTagsOf(place),
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


function closeDetailPanel(){
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
    d.classList.remove('show');
    $('.mapwrap')?.classList.remove('detailOpen');
    return;
  }
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

  d.classList.add('show');
  $('.mapwrap')?.classList.add('detailOpen');
  d.innerHTML=`<div class="detailHeader"><div class="detailTitleWrap"><h2>${esc(p.name)}</h2></div><button id="detailCloseBtn" class="detailClose" type="button" aria-label="상세 닫기">×</button></div>
  <div class="copyRow">
    ${copyButtonHtml('업체명 복사',p.name)}
    ${p.address?copyButtonHtml('주소 복사',p.address):''}
    ${p.address?copyButtonHtml('이름+주소 복사',combinedCopy):''}
  </div>
  ${(p.photoUrls||[]).length?`<div class="placePhotos">${p.photoUrls.slice(0,5).map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" loading="lazy" alt="${esc(p.name)} 업체 사진"></a>`).join('')}</div>`:''}
  <div class="badges"><span class="badge main">${categoryIcon(p.category,p.subcategory)} ${catLabel(p.category)}</span><span class="badge">${esc(p.category==='restaurant'?normalizedRestaurantSub(p.subcategory):p.subcategory)}</span>${restaurantTagsHtml(p)}${owner?'<span class="badge">내가 등록</span>':''}${benefitInlineBadgeHtml(p)}${p.deleteRequested?'<span class="badge deleteRequest">삭제요청</span>':''}</div><div class="desc">${esc(p.address||'')}<br>${esc(p.description||'')}</div>${p.memberBenefit?`<div class="benefitRow"><strong>${benefitInfoLabel(p)}</strong><div class="benefitText">${esc(p.benefitText||'카페 회원 전용 혜택 제공')}</div></div>`:''}<div class="scorebox"><div><div class="scorebig">${st.rating==null?'—':st.rating.toFixed(1)}</div><div style="font-size:11px;color:#6b7280">우리 회원 평균</div></div><div style="font-size:12px;color:#6b7280">평가 ${st.count}개</div></div>${management}<button id="writeReview" class="btn primary">후기 남기기</button><div style="margin-top:12px">${st.reviews.length?st.reviews.map(r=>`<div class="review"><div class="reviewtop"><span>${esc(r.nickname)}</span><span>★ ${r.rating}</span></div><div class="reviewtxt">${esc(r.text)}</div>${(r.photoUrls||[]).length?`<div class="reviewPhotos">${r.photoUrls.slice(0,3).map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" loading="lazy" alt="회원 후기 사진"></a>`).join('')}</div>`:''}</div>`).join(''):'<div class="empty">아직 회원 후기가 없습니다.</div>'}</div>`;

  if($('#detailCloseBtn')) $('#detailCloseBtn').onclick=()=>closeDetailPanel();
  $('#writeReview').onclick=()=>openReview();
  if($('#editPlaceBtn')) $('#editPlaceBtn').onclick=()=>openEditPlace(p,state.isAdmin?'admin':'owner');
  if($('#requestDeleteBtn')) $('#requestDeleteBtn').onclick=()=>requestOwnerDelete(p.id);
  if($('#adminDeleteBtn')) $('#adminDeleteBtn').onclick=()=>adminDeletePlace(p.id);
  if($('#clearDeleteRequestBtn')) $('#clearDeleteRequestBtn').onclick=()=>adminClearDeleteRequest(p.id);
}
function renderAll(){renderCats();renderList();renderMarkers();renderGolfCourses();renderPoiMarkers();renderDetail()}
async function selectPlace(id,pan=true,showInfo=false){
  closeSystemInfo();
  state.selected=id;
  renderList();
  renderDetail();

  const p=db().places.find(x=>x.id===id);
  if(!p || !state.map)return;

  const pos={lat:Number(p.lat),lng:Number(p.lng)};

  if(pan){
    cancelPendingMapWork();
    await focusLocationAtZoom(pos,17);
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
  if(t.has('golf_course') || n.includes('golf')) return ['golf','골프장'];
  if(n.includes('market') || n.includes('chợ') || n.includes('cho ') || n.includes('night market')) return ['market',n.includes('night')?'야시장':'전통시장'];
  if(t.has('tourist_attraction') || t.has('park') || n.includes('beach') || n.includes('square')) return ['attraction',n.includes('beach')?'해변':'랜드마크'];
  if(t.has('lodging')) return ['stay','호텔'];
  if(t.has('spa')) return ['spa','스파'];
  if(t.has('cafe')) return ['cafe','카페'];
  if(t.has('night_club')) return ['bar','클럽'];
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
  state.newPlaceRating=Number.isFinite(Number(prefill.initialRating))?Number(prefill.initialRating):5;
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

  $('#pName').value=prefill.name||'';
  $('#pArea').value=prefill.area||currentCity().label||'';
  $('#pAddress').value=prefill.address||'';
  $('#pDesc').value=prefill.description||'';
  if($('#addressLookupStatus')) $('#addressLookupStatus').textContent=prefill.addressMode
    ? '주소를 입력한 뒤 「주소로 위치 찾기」를 눌러주세요.'
    : (prefill.address?'지도에서 선택한 업체 주소입니다.':'지도에서 업체를 클릭하거나 주소를 입력해 위치를 찾을 수 있습니다.');
  $('#pBenefitEnabled').checked=!!prefill.memberBenefit;
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
