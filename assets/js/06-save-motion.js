async function savePlace(){
  if(state.placeSaveInProgress)return;

  if(state.placePhotoProcessing){
    setPlaceSaveStatus('사진 처리 중입니다. 잠시 후 저장해주세요.',false,true);
    alert('사진 처리 중입니다. 잠시 후 다시 저장해주세요.');
    return;
  }

  const saveBtn=$('#savePlace');
  if(saveBtn)saveBtn.disabled=false;

  const name=$('#pName').value.trim();
  const loc=state.clickLatLng;

  if(!name){
    alert('업체명을 입력해주세요.');
    return;
  }
  if(!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))){
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
      tags:$('#pCat').value==='restaurant' ? selectedRestaurantTags() : []
    };

    setPlaceSaving(true,'수정 저장 중…');
    setPlaceSaveStatus('서버에 수정 내용을 저장하고 있습니다.');

    try{
      const result=await updateExistingPlaceWithFallback(placeId,current,patch);

      if(!result.ok){
        setPlaceSaveStatus(
          result.reason==='admin'
            ? '관리자 인증이 만료되었거나 수정 권한을 확인하지 못했습니다.'
            : '이 업체를 등록한 기기인지 확인하지 못했습니다.',
          false,
          true
        );

        if(result.reason==='admin'){
          state.isAdmin=false;
          safeSessionRemove('viettrip_admin_key_v1');
          $('#adminBtn').textContent='관리자';
          $('#adminBtn').classList.remove('adminOn');
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
      if(updatedCity && CITY_DATA[updatedCity]){
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
    cityKey:nearestCityKeyForLatLng(loc.lat,loc.lng)||state.city,
    name,
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
    tags:$('#pCat').value==='restaurant' ? selectedRestaurantTags() : []
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

  if(savedCity && CITY_DATA[savedCity]){
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
  const mine=db().reviews.find(r=>r.placeId===state.selected && (r.createdBy||'')===getDeviceId());

  state.rating=mine?.rating||5;
  state.reviewExistingPhotos=[...(mine?.photoUrls||[])].slice(0,3);
  state.reviewNewFiles=[];

  $('#rName').value=mine?.nickname||$('#rName').value||'';
  $('#rText').value=mine?.text||'';
  if($('#rPhotos'))$('#rPhotos').value='';

  renderStars();
  renderReviewPhotoPreview();
  $('#reviewModal').classList.add('open');
}
function renderStars(){$('#stars').innerHTML=[1,2,3,4,5].map(n=>`<button class="star ${n<=state.rating?'on':''}" data-star="${n}">★</button>`).join('');document.querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>{state.rating=Number(b.dataset.star);renderStars()})}
async function saveReview(){
  const nickname=$('#rName').value.trim(),text=$('#rText').value.trim();
  if(!nickname||!text){alert('닉네임과 후기를 입력하세요.');return}

  const btn=$('#saveReview');
  if(btn)btn.disabled=true;

  const deviceId=getDeviceId();
  const now=new Date().toISOString();
  const x=db();

  let existing=x.reviews.find(r=>r.placeId===state.selected && (r.createdBy||'')===deviceId);
  let reviewId=existing?.id || crypto.randomUUID();

  try{
    const photoUrls=await uploadSelectedReviewPhotos(state.selected,reviewId);

    const remoteId=await supaRpc('device_upsert_review',{
      p_review_id:reviewId,
      p_place_id:state.selected,
      p_device_id:deviceId,
      p_nickname:nickname,
      p_rating:Number(state.rating),
      p_body:text,
      p_photo_urls:photoUrls
    });

    if(remoteId)reviewId=String(remoteId).replace(/^"|"$/g,'');

    if(existing){
      existing.id=reviewId;
      existing.nickname=nickname;
      existing.rating=state.rating;
      existing.text=text;
      existing.createdAt=now;
      existing.createdBy=deviceId;
      existing.photoUrls=photoUrls;
    }else{
      existing={
        id:reviewId,
        placeId:state.selected,
        nickname,
        rating:state.rating,
        text,
        createdAt:now,
        createdBy:deviceId,
        photoUrls
      };
      x.reviews.push(existing);
    }

    saveDb(dedupeDbData(x));
    $('#reviewModal').classList.remove('open');
    revokeReviewPreviewUrls();

    const refreshed=await fetchSharedDb();
    saveDb(refreshed);
    renderAll();
    if(state.selected)renderDetail();

    setDbStatus(`후기 저장 완료 · 사진 ${photoUrls.length}장`,true);
  }catch(err){
    console.error('review/photo save failed',err);
    alert('후기 또는 사진 저장 중 오류가 발생했습니다. 사진은 자동 압축 후 750KB 이하만 업로드됩니다.');
    setDbStatus('후기/사진 저장 오류');
  }finally{
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

function makeAreaLabel(position,text){
  class AreaLabel extends google.maps.OverlayView{
    constructor(pos,label){super();this.pos=pos;this.label=label;this.div=null}
    onAdd(){
      const div=document.createElement('div');
      div.className='area-label';
      div.textContent=this.label;
      this.div=div;
      this.getPanes().overlayMouseTarget.appendChild(div);
    }
    draw(){
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
  // 같은 대분류/소분류를 다시 클릭하면 범위만 사라짐
  if(state.rangeSelectionKey===key && state.selectionOverlays.length){
    clearSelectionRanges(true);
    clearAreaLabels();
    if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}
    return false;
  }

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

function addSelectionCircle(center,radius,color='#1a73e8',fillOpacity=.12,strokeOpacity=.75){
  const circle=new google.maps.Circle({
    map:state.map,
    center,
    radius,
    fillColor:color,
    fillOpacity,
    strokeColor:color,
    strokeOpacity,
    strokeWeight:2.6,
    clickable:true,
    zIndex:2
  });

  circle.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(circle.getCenter(),1);
  });

  state.selectionOverlays.push(circle);
  return circle;
}

function addSelectionPath(path,color='#1a73e8'){
  const line=new google.maps.Polyline({
    map:state.map,
    path,
    geodesic:true,
    strokeColor:color,
    strokeOpacity:.5,
    strokeWeight:42,
    clickable:true,
    zIndex:2
  });

  line.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(pathCenter(path),1);
  });

  state.selectionOverlays.push(line);
  return line;
}

function drawCityRange(key){
  const c=CITY_DATA[key];
  if(!c)return;
  const cfg=CITY_RANGES[key]||{radius:10000,color:'#1a73e8'};
  addSelectionCircle(c.center,cfg.radius,cfg.color,.08,.55);

  (c.areas||[]).forEach(a=>{
    if(a.kind==='circle'){
      addSelectionCircle(a.center,a.radius,a.color||'#64748b',.05,.22);
    }else if(a.path){
      const line=new google.maps.Polyline({
        map:state.map,
        path:a.path,
        geodesic:true,
        strokeColor:a.color||'#64748b',
        strokeOpacity:.18,
        strokeWeight:24,
        clickable:true,
        zIndex:2
      });
      line.addListener('click',async ()=>{
        closeSystemInfo();
        await focusRangeLocation(pathCenter(a.path),1);
      });
      state.selectionOverlays.push(line);
    }
  });
}

function showCityRange(key,selectionKey=`city:${key}`){
  if(!state.map || !CITY_DATA[key])return false;
  return toggleSelectionRange(selectionKey,()=>drawCityRange(key));
}

function showBusinessRange(categoryId,subId='all'){
  const key=`business:${state.city}:${categoryId}:${subId}`;
  return toggleSelectionRange(key,()=>drawCityRange(state.city));
}

function showAreaRange(area){
  if(!state.map || !area)return false;
  const key=`area:${state.city}:${area.name}`;

  return toggleSelectionRange(key,()=>{
    const bounds=makeBounds();

    if(area.kind==='circle'){
      addSelectionCircle(area.center,area.radius,area.color||'#1a73e8',.16,.85);
      extendBoundsByCircle(bounds,area.center,area.radius);
    }else if(area.path){
      addSelectionPath(area.path,area.color||'#1a73e8');
      (area.path||[]).forEach(pt=>bounds.extend(pt));
    }

    fitUnifiedBounds(bounds,{padding:90,maxZoom:16});
  });
}

function showTypeRanges(type){
  cancelPendingMapWork();
  if(!state.map)return false;
  const areas=currentAreas().filter(a=>normalizeAreaType(a)===type);

  clearSelectionRanges();
  clearAreaLabels();

  if(!areas.length){
    setDbStatus('이 분류의 범위 정보가 아직 없습니다.');
    return false;
  }

  const bounds=makeBounds();

  areas.forEach(a=>{
    if(a.kind==='circle'){
      addSelectionCircle(a.center,a.radius,a.color||'#1a73e8',.10,.62);
      extendBoundsByCircle(bounds,a.center,a.radius);
    }else if(a.path){
      addSelectionPath(a.path,a.color||'#1a73e8');
      (a.path||[]).forEach(pt=>bounds.extend(pt));
    }
  });

  state.rangeSelectionKey=`type:${state.city}:${type}`;
  fitUnifiedBounds(bounds,{padding:82,maxZoom:16});
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

  // 범위형 항목은 모든 도시에서 동일하게: 범위만 표시, 설명 팝업 없음.
  closeSystemInfo();

  const visible=showAreaRange(area);
  closeAreaPanel();

  clearAreaLabels();
  if(!visible)return;

  const label=makeAreaLabel(area.center,area.name);
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

  // 시스템 장소는 전 도시/전 분류 동일:
  // hover에서는 아이콘만 강조하고 설명창은 띄우지 않는다.
  m.addListener('mouseover',()=>{
    m.setIcon(poiSvg(p.type,p.icon||'•',true));
  });

  m.addListener('mouseout',()=>{
    m.setIcon(poiSvg(p.type,p.icon||'•',false));
    hideHover();
  });

  // 클릭 = 기존 설명 닫기 → 부드러운 이동 → 부드러운 확대
  m.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(location,1);
  });

  m._poiName=p.name;
  state.poiMarkers.push(m);
  return m;
}

function resolvePoiLocation(p,done){
  if(Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))){
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
