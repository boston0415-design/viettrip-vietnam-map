async function savePlace(){
  if(state.placeSaveInProgress)return;
  setPlaceSaving(true);
  try{
    await savePlaceOnce();
  }finally{
    setPlaceSaving(false);
  }
}

async function savePlaceOnce(){

  if(state.placePhotoProcessing){
    setPlaceSaveStatus('사진 처리 중입니다. 잠시 후 저장해주세요.',false,true);
    alert('사진 처리 중입니다. 잠시 후 다시 저장해주세요.');
    return;
  }

  const name=$('#pName').value.trim();
  const registrantNickname=normalizedRegistrantNickname($('#pNickname').value);
  const loc=state.clickLatLng;

  if(!state.editPlaceId && !validRegistrantNickname(registrantNickname)){
    $('#pNickname').setAttribute('aria-invalid','true');
    $('#pNicknameHelp').textContent='등록자 닉네임을 1~30자로 입력해주세요. 업체 상세에 공개됩니다.';
    $('#pNickname').focus();
    setPlaceSaveStatus('등록자 닉네임을 1~30자로 입력해주세요.',false,true);
    return;
  }
  $('#pNickname').removeAttribute('aria-invalid');
  if(!state.editPlaceId){
    rememberMemberNickname(registrantNickname);
    $('#pNicknameHelp').textContent=REGISTRANT_NICKNAME_HELP;
  }

  if(!name){
    alert('업체명을 입력해주세요.');
    return;
  }
  if(!validMapLocation(loc)){
    alert('지도에서 위치를 클릭하거나 주소 추천/주소 검색으로 위치를 먼저 선택해주세요.');
    return;
  }

  const x=db();
  const candidateKey=`${normalizePlaceName(name)}|${Number(loc.lat).toFixed(5)}|${Number(loc.lng).toFixed(5)}`;

  // 기존 업체 수정
  if(state.editPlaceId){
    const placeId=state.editPlaceId;
    const current=x.places.find(p=>p.id===placeId);
    if(!current){
      alert('수정할 업체를 찾지 못했습니다.');
      closeEditMode();
      return;
    }

    const localDup=x.places.find(p=>p.id!==placeId && placeLocationKey(p)===candidateKey);
    if(localDup){
      alert('같은 위치에 동일한 업체가 이미 등록되어 있습니다.');
      return;
    }

    const benefitEnabled=$('#pBenefitEnabled').checked;
    const benefitText=$('#pBenefitText').value.trim();

    let placePhotoUrls;
    try{
      placePhotoUrls=await uploadSelectedPlacePhotos(placeId);
    }catch(err){
      console.error('place photo upload failed',err);
      alert(`업체 사진 저장 실패

${err?.message||'사진을 처리하지 못했습니다.'}`);
      return;
    }

    const patch={
      name,
      category:$('#pCat').value,
      subcategory:$('#pSub').value,
      area:$('#pArea').value.trim(),
      address:$('#pAddress').value.trim(),
      lat:Number(loc.lat),
      lng:Number(loc.lng),
      description:$('#pDesc').value.trim(),
      member_benefit:benefitEnabled,
      benefit_text:benefitEnabled ? (benefitText || '카페 회원 전용 혜택 제공') : '',
      photo_urls:placePhotoUrls,
      tags:selectedPlaceTags()
    };

    setPlaceSaving(true,'수정 저장 중…');
    setPlaceSaveStatus('서버에 수정 내용을 저장하고 있습니다.');

    try{
      const result=await updateExistingPlaceWithFallback(placeId,current,patch);

      if(!result.ok){
        if(result.reason==='connection'||result.reason==='admin_save'){
          setPlaceSaveStatus('수정 내용을 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 저장해 주세요.',false,true);
          alert('저장하지 못했습니다. 관리자 로그인과 입력한 내용은 유지됩니다. 다시 저장해 주세요.');
          return;
        }
        setPlaceSaveStatus(
          result.reason==='admin'
            ? '관리자 인증이 만료되었거나 수정 권한을 확인하지 못했습니다.'
            : '이 업체를 등록한 기기인지 확인하지 못했습니다.',
          false,
          true
        );

        if(result.reason==='admin'){
          clearAdminSession();
        }

        alert(
          result.reason==='admin'
            ? '관리자 인증을 다시 해주세요. 입력한 수정 내용은 그대로 유지됩니다.'
            : '수정 권한을 확인하지 못했습니다. 등록한 기기 또는 관리자 모드에서 수정해주세요.'
        );
        return;
      }

      // RPC 성공 즉시 로컬 화면에도 반영.
      // 후속 전체 DB 동기화가 실패해도 저장 자체는 성공으로 처리한다.
      applyPlacePatchLocally(current,patch);
      saveDb(x);
      rememberOwnedPlace(placeId);

      state.selected=placeId;
      const updatedCity=nearestCityKeyForLatLng(loc.lat,loc.lng);
      if(state.city!=='all' && updatedCity && CITY_DATA[updatedCity]){
        state.city=updatedCity;
        renderCityControls();
        renderAreaList();
        renderPopularAreas();
      }

      $('#placeModal').classList.remove('open');
      if(state.addressSearchMarker){
        state.addressSearchMarker.setMap(null);
        state.addressSearchMarker=null;
      }

      resetPlacePhotoDraftUi();
      closeEditMode();
      renderAll();
      selectPlace(placeId,true,false);
      setDbStatus('업체 정보 수정 완료',true);

      try{
        const shared=await fetchSharedDb();
        saveDb(shared);
        state.selected=placeId;
        renderAll();
        renderDetail();
      }catch(syncErr){
        console.warn('post-save refresh failed; saved update kept',syncErr);
        setDbStatus('수정 저장 완료 · 전체 DB 동기화는 다음 접속 때 재시도',true);
      }
    }catch(err){
      console.error('place edit failed',err);
      setPlaceSaveStatus(err?.message||'수정 저장 중 오류가 발생했습니다.',false,true);
      alert(`수정 저장 실패\n\n${err?.message||'잠시 후 다시 시도해주세요.'}`);
    }finally{
      setPlaceSaving(false);
    }
    return;
  }

  const localDup=x.places.find(p=>placeLocationKey(p)===candidateKey);
  if(localDup){
    alert('이미 등록된 업체입니다.');
    $('#placeModal').classList.remove('open');
    clearSearchMarker();
    state.selected=localDup.id;
    renderAll();
    selectPlace(localDup.id,true,true);
    return;
  }

  try{
    const shared=await fetchSharedDb();
    const remoteDup=shared.places.find(p=>placeLocationKey(p)===candidateKey);
    if(remoteDup){
      saveDb(shared);
      alert('이미 다른 회원이 등록한 업체입니다.');
      $('#placeModal').classList.remove('open');
      clearSearchMarker();
      state.selected=remoteDup.id;
      renderAll();
      selectPlace(remoteDup.id,true,true);
      return;
    }
  }catch(err){
    console.warn('duplicate check skipped',err);
  }

  const benefitEnabled=$('#pBenefitEnabled').checked;
  const benefitText=$('#pBenefitText').value.trim();
  const newId=crypto.randomUUID();

  let placePhotoUrls=[];
  try{
    placePhotoUrls=await uploadSelectedPlacePhotos(newId);
  }catch(err){
    console.error('place photo upload failed',err);
    alert('업체 사진 업로드 중 오류가 발생했습니다.');
    return;
  }

  const newPlace={
    id:newId,
    cityKey:nearestCityKeyForLatLng(loc.lat,loc.lng)||(state.city==='all'?null:state.city),
    name,
    registrantNickname,
    category:$('#pCat').value,
    subcategory:$('#pSub').value,
    area:$('#pArea').value.trim(),
    address:$('#pAddress').value.trim(),
    lat:Number(loc.lat),
    lng:Number(loc.lng),
    description:$('#pDesc').value.trim(),
    initialRating:state.newPlaceRating,
    memberBenefit:benefitEnabled,
    benefitText:benefitEnabled ? (benefitText || '카페 회원 전용 혜택 제공') : '',
    photoUrls:placePhotoUrls,
    tags:selectedPlaceTags()
  };

  x.places.push(newPlace);
  rememberOwnedPlace(newId);
  saveDb(x);

  try{
    await supaInsert('places',placeToRemote(newPlace));
    // 서버가 생성한 소유자 해시까지 즉시 다시 받아 등록 직후에도 수정 버튼 활성화
    const sharedAfterInsert=await fetchSharedDb();
    saveDb(sharedAfterInsert);
    setDbStatus('공용 DB 저장 완료',true);
  }catch(err){
    console.error('place remote save failed',err);
    setDbStatus('공용 DB 저장 지연 · 재접속 시 자동 동기화');
  }

  // 등록창은 저장 즉시 닫힘
  const modal=document.getElementById('placeModal');
  if(modal) modal.classList.remove('open');
  const methodModal=document.getElementById('registerMethodModal');
  if(methodModal) methodModal.classList.remove('open');
  cancelRegisterMode();
  resetPlacePhotoDraftUi();
  clearSearchMarker();

  if(state.addressSearchMarker){
    state.addressSearchMarker.setMap(null);
    state.addressSearchMarker=null;
  }

  // 기존 필터 때문에 새 업체가 숨지 않도록 초기화
  state.query='';
  state.cat='all';
  state.sub='all';
  state.navCategory=null;
  state.ratingFilter='all';
  renderRatingFilterState();
  state.selected=newId;
  $('#searchInput').value='';

  const savedPos={lat:Number(loc.lat),lng:Number(loc.lng)};
  const savedCity=placeCityKey(newPlace);

  if(state.city!=='all' && savedCity && CITY_DATA[savedCity]){
    state.city=savedCity;
    renderCityControls();
    renderAreaList();
    renderPopularAreas();
  }

  state.clickLatLng=null;

  renderAll();
  renderHierarchyNav();

  cancelPendingMapWork();
  await focusLocationAtZoom(savedPos,17);

  // 새 마커를 즉시 표시하고 설명창도 열기
  setTimeout(()=>selectPlace(newId,false,true),80);
}
function openReview(){
  if(state.reviewSaveInProgress)return;
  state.reviewEditPlaceId=state.selected;
  const mine=db().reviews.find(r=>r.placeId===state.selected && isOwnReview(r));
  const place=db().places.find(p=>p.id===state.selected);
  const owner=isOwnerPlace(place);
  const editing=!!mine||owner;
  if($('#reviewPlaceName'))$('#reviewPlaceName').textContent=place?.name||'';
  if($('#reviewSaveStatus'))$('#reviewSaveStatus').textContent=state.reviewsLoadFailed?'후기 연결이 지연되어 마지막으로 읽은 내용을 표시합니다. 저장 전 기존 내용을 확인해 주세요.':'';
  $('#reviewModal h3').textContent=editing?'내 별점·후기 수정':'별점·후기 남기기';
  $('#saveReview').textContent=editing?'수정 저장':'저장';

  state.rating=mine?.rating??(owner?place.initialRating:null)??null;
  state.reviewExistingPhotos=[...(mine?.photoUrls||[])].slice(0,3);
  state.reviewNewFiles=[];

  $('#rName').value=mine?.nickname||(owner?place.registrantNickname:'')||rememberedMemberNickname();
  bindRememberedNicknameInput($('#rName'));
  $('#rText').value=mine?.text||'';
  $('#rRecommended').checked=mine?!!mine.recommended:!!(owner&&place.tags?.includes('강추업소'));
  $('#rCafeUrl').value=mine?.cafeUrl||'';
  $('#reviewCafeLink').open=!!mine?.cafeUrl;
  if($('#rPhotos'))$('#rPhotos').value='';

  renderStars();
  renderReviewPhotoPreview();
  $('#reviewModal').classList.add('open');
  window.ReviewVault?.offer(place?.id,mine);
}
function renderStars(){$('#stars').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" class="star ${n<=state.rating?'on':''}" data-star="${n}" aria-label="${n}점" aria-pressed="${state.rating===n}">★</button>`).join('')+'<button type="button" id="skipReviewRating" class="btn">별점 선택 안 함</button>';document.querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>{state.rating=Number(b.dataset.star);renderStars()});$('#skipReviewRating').onclick=()=>{state.rating=null;renderStars()}}
async function saveReview(){
  if(state.reviewSaveInProgress)return;
  const text=$('#rText').value.trim();
  const nickname=$('#rName').value.trim();
  const cafeUrl=normalizeCafeReviewUrl($('#rCafeUrl').value);
  if(cafeUrl===null){alert('네이버 카페의 ‘URL 복사’로 받은 주소를 붙여주세요. cafe.naver.com과 naver.me 주소를 사용할 수 있습니다.');return}
  if(cafeUrl&&!text){alert('카페 링크와 함께 간단한 후기를 입력해주세요.');return}
  if(state.rating==null&&!text){alert('별점을 선택하거나 후기를 입력하세요.');return}
  if(text&&!nickname){alert('후기를 남길 닉네임을 입력하세요.');return}
  const placeId=state.reviewEditPlaceId||state.selected;
  if(!placeId)return;
  const rating=state.rating;
  const recommended=$('#rRecommended').checked;
  const oldReview=db().reviews.find(r=>r.placeId===placeId&&isOwnReview(r));
  if(oldReview?.text&&text&&text!==oldReview.text&&!confirm('기존 후기 내용을 새 내용으로 수정할까요? 빈칸으로 저장하면 기존 후기는 유지됩니다.'))return;
  window.ReviewVault?.capture();
  window.ReviewVault?.archive(oldReview?[oldReview]:[]);
  state.reviewSaveInProgress=true;
  if($('#reviewSaveStatus'))$('#reviewSaveStatus').textContent='저장 중입니다. 창을 닫지 말아주세요.';

  const btn=$('#saveReview');
  if(btn)btn.disabled=true;

  const now=new Date().toISOString();
  const x=db();

  let existing=x.reviews.find(r=>r.placeId===placeId && isOwnReview(r));
  const registeredPlace=x.places.find(p=>p.id===placeId);
  const deviceId=window.MapMembership?.credentialFor(existing?.createdByHash)
    || (isOwnerPlace(registeredPlace)?window.MapMembership?.credentialFor(registeredPlace.ownerKeyHash):null)
    || getDeviceId();
  if(!existing || nickname!==existing.nickname)rememberMemberNickname(nickname);
  let reviewId=existing?.id || crypto.randomUUID();

  try{
    const photoUrls=await uploadSelectedReviewPhotos(placeId,reviewId);

    const remoteId=await supaRpc('device_upsert_recommended_review',{
      p_review_id:reviewId,
      p_place_id:placeId,
      p_device_id:deviceId,
      p_nickname:nickname,
      p_rating:rating==null?null:Number(rating),
      p_body:text,
      p_photo_urls:photoUrls,
      p_cafe_url:cafeUrl,
      p_recommended:recommended
    });

    if(remoteId)reviewId=String(remoteId).replace(/^"|"$/g,'');

    if(existing){
      existing.id=reviewId;
      existing.nickname=nickname||existing.nickname||'회원';
      existing.rating=rating??existing.rating;
      existing.text=text||existing.text;
      existing.createdAt=now;
      existing.createdBy=deviceId;
      if(text){existing.photoUrls=photoUrls;existing.cafeUrl=cafeUrl}
    }else{
      existing={
        id:reviewId,
        placeId,
        nickname:nickname||'회원',
        rating,
        text,
        createdAt:now,
        createdBy:deviceId,
        photoUrls,
        cafeUrl
      };
      x.reviews.push(existing);
    }

    existing.recommended=recommended;
    const ownPlace=x.places.find(p=>p.id===placeId);
    if(isOwnerPlace(ownPlace)){
      if(existing.rating==null)existing.rating=ownPlace.initialRating??null;
      ownPlace.initialRating=null;
      ownPlace.tags=(ownPlace.tags||[]).filter(t=>t!=='강추업소');
    }
    saveDb(dedupeDbData(x));
    $('#reviewModal').classList.remove('open');
    window.ReviewVault?.saved(placeId);
    state.reviewEditPlaceId=null;
    revokeReviewPreviewUrls();

    try{
      const refreshed=await fetchSharedDb();
      saveDb(refreshed);
    }catch(syncErr){
      console.warn('Review saved; shared refresh deferred',syncErr);
    }
    renderAll();
    if(state.selected)renderDetail();

    setDbStatus('별점·후기 저장 완료',true);
  }catch(err){
    console.error('review/photo save failed',err);
    alert('후기 또는 사진 저장 중 오류가 발생했습니다. 사진은 자동 압축 후 750KB 이하만 업로드됩니다.');
    if($('#reviewSaveStatus'))$('#reviewSaveStatus').textContent='저장하지 못했습니다. 입력 내용은 남아 있습니다. 다시 시도해 주세요.';
    setDbStatus('후기/사진 저장 오류');
  }finally{
    state.reviewSaveInProgress=false;
    if(btn)btn.disabled=false;
  }
}

function clearPopularAreas(){
  state.areaOverlays.forEach(o=>o.setMap&&o.setMap(null));
  state.areaLabels.forEach(o=>o.setMap&&o.setMap(null));
  state.areaOverlays=[];state.areaLabels=[];
}

function clearAreaLabels(){
  state.areaLabels.forEach(o=>o.setMap&&o.setMap(null));
  state.areaLabels=[];
}

function makeAreaLabel(position,text,feature={}){
  class AreaLabel extends google.maps.OverlayView{
    constructor(pos,label){super();this.pos=pos;this.label=label;this.div=null}
    onAdd(){
      const div=document.createElement('div');
      div.className='area-label';
      div.textContent=this.label;
      div.tabIndex=0;div.setAttribute('role','button');div.setAttribute('aria-label',`${this.label} ${feature.center&&feature.type?'범위':'정보'} 보기`);
      const html=()=>mapFeatureHtml(feature,areaRangeRadius(feature));
      div.addEventListener('mouseenter',()=>showPositionHover(position,html()));
      div.addEventListener('mouseleave',hideHover);
      const open=event=>{
        event.stopPropagation();hideHover();
        if(feature.center&&feature.type){jumpToPopularArea(feature.name);return}
        showClickInfo(position,html());
      };
      div.addEventListener('click',open);
      div.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(event)}});

      this.div=div;
      this.getPanes().overlayMouseTarget.appendChild(div);
      this.updateZoomAppearance();
    }
    updateZoomAppearance(){
      if(!this.div)return;
      const style=referenceRangeZoomStyle({strokeOpacity:1,persistent:!!(feature.center&&feature.type)});
      this.div.style.display=style.visible?'':'none';
      this.div.style.opacity=String(style.strokeOpacity);
    }
    draw(){
      this.updateZoomAppearance();
      const p=this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.pos));
      if(this.div&&p){this.div.style.left=p.x+'px';this.div.style.top=p.y+'px'}
    }
    onRemove(){if(this.div){this.div.remove();this.div=null}}
  }
  const label=new AreaLabel(position,text);
  label.setMap(state.map);
  return label;
}



function clearSelectionRanges(resetKey=true){
  (state.selectionOverlays||[]).forEach(o=>o.setMap&&o.setMap(null));
  state.selectionOverlays=[];
  if(resetKey) state.rangeSelectionKey=null;
}

function toggleSelectionRange(key,drawFn){
  // Re-selecting an active category must keep its range visible.
  clearSelectionRanges(false);
  drawFn();
  state.rangeSelectionKey=key;
  return true;
}


function easeInOutCubicValue(t){
  return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
}

function normalizeLngDelta(delta){
  if(delta>180)return delta-360;
  if(delta<-180)return delta+360;
  return delta;
}

function smoothPanToPosition(target,duration=430,token=0){
  return new Promise(resolve=>{
    if(!state.map){resolve();return}

    const startCenter=state.map.getCenter();
    if(!startCenter){state.map.setCenter(target);resolve();return}

    const start={
      lat:startCenter.lat(),
      lng:startCenter.lng()
    };
    const dLat=target.lat-start.lat;
    const dLng=normalizeLngDelta(target.lng-start.lng);
    const startTime=performance.now();

    function frame(now){
      if(!state.map || state.rangeMoveAnimationToken!==token){
        resolve();
        return;
      }

      const t=Math.min(1,(now-startTime)/duration);
      const e=easeInOutCubicValue(t);

      state.map.setCenter({
        lat:start.lat+dLat*e,
        lng:start.lng+dLng*e
      });

      if(t<1){
        requestAnimationFrame(frame);
      }else{
        state.map.setCenter(target);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

function smoothZoomTo(targetZoom,duration=360,token=0){
  return new Promise(resolve=>{
    if(!state.map){resolve();return}

    const startZoom=Number(state.map.getZoom());
    if(!Number.isFinite(startZoom)){
      state.map.setZoom(targetZoom);
      resolve();
      return;
    }

    const diff=targetZoom-startZoom;
    if(Math.abs(diff)<.02){
      resolve();
      return;
    }

    const startTime=performance.now();

    function frame(now){
      if(!state.map || state.rangeMoveAnimationToken!==token){
        resolve();
        return;
      }

      const t=Math.min(1,(now-startTime)/duration);
      const e=easeInOutCubicValue(t);

      // Vector map에서는 fractional zoom으로 실제 부드러운 확대.
      // 지원하지 않는 환경에서도 최종 값은 정확히 적용.
      state.map.setZoom(startZoom+diff*e);

      if(t<1){
        requestAnimationFrame(frame);
      }else{
        state.map.setZoom(targetZoom);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}


async function focusLocationAtZoom(center,targetZoom=17,{panDuration=460,zoomDuration=420}={}){
  if(!state.map || !center)return;

  const pos={
    lat:typeof center.lat==='function'?center.lat():Number(center.lat),
    lng:typeof center.lng==='function'?center.lng():Number(center.lng)
  };
  if(!Number.isFinite(pos.lat)||!Number.isFinite(pos.lng))return;

  closeSystemInfo();

  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
  const token=state.rangeMoveAnimationToken;

  await smoothPanToPosition(pos,panDuration,token);
  if(state.rangeMoveAnimationToken!==token)return;

  await smoothZoomTo(Math.max(4,Math.min(18,Number(targetZoom)||17)),zoomDuration,token);
  if(state.rangeMoveAnimationToken!==token)return;

  // 최종 프레임에서 정확히 대상 좌표를 중앙에 고정.
  state.map.setCenter(pos);
}

async function focusRangeLocation(center,zoomStep=1){
  if(!state.map || !center)return;

  if(state.clickInfo){
    state.clickInfo.close();
    state.clickInfo=null;
  }

  const pos={
    lat:typeof center.lat==='function'?center.lat():Number(center.lat),
    lng:typeof center.lng==='function'?center.lng():Number(center.lng)
  };
  if(!Number.isFinite(pos.lat)||!Number.isFinite(pos.lng))return;

  const current=Number(state.map.getZoom())||12;

  // 범위를 눌렀을 때 체감될 정도로 확대.
  // 멀리 보고 있을수록 더 크게, 이미 가까우면 과도하지 않게 확대한다.
  let effectiveStep;
  if(current<=11.5){
    effectiveStep=2.5;
  }else if(current<=13.5){
    effectiveStep=2.2;
  }else if(current<=15){
    effectiveStep=1.8;
  }else{
    effectiveStep=1.35;
  }

  effectiveStep=Math.max(effectiveStep,Number(zoomStep)||0);
  const target=Math.min(18,current+effectiveStep);

  // 새 범위를 클릭하면 이전 애니메이션은 즉시 중단
  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
  const token=state.rangeMoveAnimationToken;

  // 1. 중심으로 부드럽게 이동
  await smoothPanToPosition(pos,430,token);
  if(state.rangeMoveAnimationToken!==token)return;

  // 2. 이동이 끝난 뒤 부드럽게 확대
  await smoothZoomTo(target,440,token);
  if(state.rangeMoveAnimationToken!==token)return;

  // 최종 위치를 정확히 대상 중심에 고정
  state.map.setCenter(pos);
}



function pathCenter(path){
  if(!path || !path.length)return null;
  const b=new google.maps.LatLngBounds();
  path.forEach(pt=>b.extend(pt));
  const c=b.getCenter();
  return {lat:c.lat(),lng:c.lng()};
}

// Reference circles help with the area overview, but must not obscure streets
// and businesses up close. Fade the fill at zoom 15–16 and outlines at 15–17.
// Only presentation changes: geographic radii, selected filters and markers stay.
function referenceRangeZoomStyle(base,zoom=state.map?.getZoom?.()){
  const value=Number(zoom);
  const z=Number.isFinite(value)?value:15;
  // Explicitly selected areas remain recognizable at street zoom; only their fill softens.
  if(base.persistent){
    const style={visible:true,clickable:true,strokeOpacity:base.strokeOpacity};
    if(base.fillOpacity!=null)style.fillOpacity=base.fillOpacity*Math.max(.35,Math.min(1,(19-z)/3));
    return style;
  }
  const outline=Math.max(0,Math.min(1,(17-z)/2));
  const style={visible:outline>0,clickable:outline>0,strokeOpacity:base.strokeOpacity*outline};
  if(base.fillOpacity!=null)style.fillOpacity=base.fillOpacity*Math.max(0,Math.min(1,16-z));
  return style;
}

function refreshReferenceRangeVisibility(){
  (state.selectionOverlays||[]).forEach(overlay=>{
    if(overlay._referenceRangeStyle)overlay.setOptions(referenceRangeZoomStyle(overlay._referenceRangeStyle));
  });
  (state.areaLabels||[]).forEach(label=>label.updateZoomAppearance?.());
}

function addSelectionCircle(center,radius,color='#1a73e8',fillOpacity=.12,strokeOpacity=.75,feature={},presentation={}){
  center=validMapLocation(center);
  radius=Number(radius);
  if(!state.map || !center || !Number.isFinite(radius) || radius<=0)return null;
  const baseStyle={fillOpacity,strokeOpacity};
  if(presentation.persistent)baseStyle.persistent=true;
  const circle=new google.maps.Circle({
    map:state.map,
    center,
    radius,
    fillColor:color,
    strokeColor:color,
    strokeWeight:presentation.strokeWeight||1.25,
    ...referenceRangeZoomStyle(baseStyle),
    zIndex:2
  });
  circle._referenceRangeStyle=baseStyle;

  bindMapFeatureInfo(circle,{...feature,center},center,radius,{backgroundRange:true});

  state.selectionOverlays.push(circle);
  return circle;
}

function addSelectionPath(path,color='#1a73e8',feature={}){
  const baseStyle={strokeOpacity:.5};
  const line=new google.maps.Polyline({
    map:state.map,
    path,
    geodesic:true,
    strokeColor:color,
    strokeWeight:4,
    ...referenceRangeZoomStyle(baseStyle),
    zIndex:2
  });
  line._referenceRangeStyle=baseStyle;

  bindMapFeatureInfo(line,feature,pathCenter(path),null,{backgroundRange:true});

  state.selectionOverlays.push(line);
  return line;
}

function areaRangeRadius(area){
  const radius=Number(area?.radius);
  // A market's reference circle includes the surrounding walking/shopping area.
  if(normalizeAreaType(area||{})==='시장')return Math.max(350,Number.isFinite(radius)?radius:0);
  if(Number.isFinite(radius)&&radius>0)return radius;
  return ({'거리':500,'야시장':250,'해변':500,'광장':250})[area?.type]||300;
}

// All ranges are geographic circles measured in meters, never pixel-sized rings.
// They indicate nearby areas, not surveyed property/administrative boundaries.
function drawAreaReference(area,bounds=null,{selected=false}={}){
  const center=validMapLocation(area?.center);
  if(!center)return null;
  const radius=areaRangeRadius(area);
  const color=normalizeAreaType(area)==='한인생활권'?'#16803c':area.color||'#1a73e8';
  const circle=addSelectionCircle(center,radius,color,selected ? .14 : .08,selected ? .9 : .7,area,{persistent:selected,strokeWeight:selected?2.5:1.25});
  if(bounds)extendBoundsByCircle(bounds,center,radius);
  return circle;
}

function drawCityRange(key){
  const c=CITY_DATA[key];
  if(!c)return;
  [...(c.areas||[]),...(EXTRA_DATA[key]?.zones||[])].forEach(a=>drawAreaReference(a));
  setDbStatus('주요 지역 주변 범위 · 행정구역 경계가 아닙니다.',true);
}

function showCityRange(key,selectionKey=`city:${key}`){
  if(!state.map || !CITY_DATA[key])return false;
  return toggleSelectionRange(selectionKey,()=>drawCityRange(key));
}

function showBusinessRange(categoryId,subId='all'){
  return focusBusinessCategory(categoryId,subId);
}

function showAreaRange(area){
  if(!state.map || !area)return false;
  collapseMobileLegend();
  const key=`area:${state.city}:${area.name}`;

  return toggleSelectionRange(key,()=>{
    const bounds=makeBounds();

    drawAreaReference(area,bounds,{selected:true});
    fitUnifiedBounds(bounds,{padding:64,maxZoom:16.5});
    setDbStatus(`${area.name} · 주변 탐색 범위 (행정·시설 경계 아님)`,true);
  });
}

function showTypeRanges(type){
  cancelPendingMapWork();
  if(!state.map)return false;
  collapseMobileLegend();
  const areas=currentAreas().filter(a=>normalizeAreaType(a)===type);

  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();

  const category=({'시장':'market','관광명소':'attraction'})[type];
  const registered=category?items().filter(p=>p.category===category && validMapLocation(p)):[];
  state.rangeSelectionKey=`type:${state.city}:${type}`;
  if(!areas.length && !registered.length){
    setDbStatus('이 분류의 범위 정보가 아직 없습니다.');
    return false;
  }

  const bounds=makeBounds();

  areas.forEach(a=>{
    drawAreaReference(a,bounds,{selected:true});
    if(type==='한인생활권'){
      const label=makeAreaLabel(a.center,a.name,a);
      label._areaName=a.name;
      state.areaLabels.push(label);
    }else{
      const marker=new google.maps.Marker({map:state.map,position:a.center,title:a.name,zIndex:75,icon:roundMapIcon(type==='시장'?'market':'attraction',a.color||'#16803c')});
      bindMapFeatureInfo(marker,a,a.center,areaRangeRadius(a),{click:false});
      marker.addListener('click',()=>jumpToPopularArea(a.name));
      state.poiMarkers.push(marker);
    }
  });

  if(category)extendRegisteredBounds(bounds,category);
  state.rangeSelectionKey=`type:${state.city}:${type}`;
  refreshRegisteredCoverage();
  fitUnifiedBounds(bounds,{padding:64,maxZoom:16.5});
  setDbStatus(`${type} · 주변 탐색 범위 (행정·시설 경계 아님)`,true);
  return true;
}

function getPopularArea(name){
  return currentAreas().find(a=>a.name===name);
}

function closeAreaPanel(){
  const panel=$('#areaPanel');
  const title=$('#areaLegendTitle');
  if(panel)panel.classList.remove('show');
  if(title)title.classList.remove('open');
}

function jumpToPopularArea(name,openPanel=false){
  cancelPendingMapWork();
  const area=getPopularArea(name);
  if(!area || !state.map)return;

  selectSystemFeature(normalizeAreaType(area),name);

  // 범위형 항목은 모든 도시에서 동일하게: 범위만 표시, 설명 팝업 없음.
  closeSystemInfo();

  const visible=showAreaRange(area);
  closeAreaPanel();

  clearAreaLabels();
  if(!visible)return;

  const label=makeAreaLabel(area.center,area.name,area);
  label._areaName=area.name;
  state.areaLabels.push(label);
}

function clearBusinessMarkersOnly(){
  state.markers.forEach(m=>m.setMap(null));
  state.markers=[];
  clearPremiumEffects();
}

function clearSelectedSystemIcons(){
  renderPoiMarkers();
  renderGolfCourses();
  hideHover();
}

function createSelectedPoiMarker(p,location,clearExisting=true){
  if(clearExisting) clearSelectedSystemIcons();

  const m=new google.maps.Marker({
    map:state.map,
    position:location,
    title:`${p.name} · ${p.type}`,
    zIndex:80,
    icon:poiSvg(p.type,p.icon||'•',false),
  });

  bindMapFeatureInfo(m,{...p,...location},location);
  m._poiName=p.name;
  state.poiMarkers.push(m);
  return m;
}

function resolvePoiLocation(p,done){
  if(validMapLocation(p)){
    done({lat:Number(p.lat),lng:Number(p.lng)});
    return;
  }
  if(!p.address || !google.maps.Geocoder){
    alert('이 위치의 주소 정보를 확인할 수 없습니다.');
    return;
  }
  const geocoder=new google.maps.Geocoder();
  geocoder.geocode({address:p.address,region:'VN'},(results,status)=>{
    if(status==='OK' && results && results[0]){
      const loc=results[0].geometry.location;
      done({lat:loc.lat(),lng:loc.lng()});
      return;
    }

    // Geocoder가 실패해도 Places 검색으로 재시도
    if(google.maps.places && google.maps.places.PlacesService && state.map){
      const service=new google.maps.places.PlacesService(state.map);
      service.textSearch({query:`${p.name} ${p.address}`,region:'VN'},(places,placeStatus)=>{
        if(placeStatus===google.maps.places.PlacesServiceStatus.OK && places && places[0]?.geometry?.location){
          const loc=places[0].geometry.location;
          done({lat:loc.lat(),lng:loc.lng()});
        }else{
          alert(`${p.name} 위치를 지도에서 찾지 못했습니다.`);
        }
      });
    }else{
      alert(`${p.name} 위치를 지도에서 찾지 못했습니다.`);
    }
  });
}




function makeBounds(){
  return new google.maps.LatLngBounds();
}

function extendBoundsByCircle(bounds,center,radius){
  if(!bounds || !center)return;
  const lat=Number(center.lat), lng=Number(center.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;

  const latDelta=radius/111320;
  const cos=Math.max(Math.cos(lat*Math.PI/180),.2);
  const lngDelta=radius/(111320*cos);

  bounds.extend({lat:lat-latDelta,lng:lng-lngDelta});
  bounds.extend({lat:lat+latDelta,lng:lng+lngDelta});
}

function mercatorY(lat){
  const sin=Math.sin(lat*Math.PI/180);
  return 0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI);
}
