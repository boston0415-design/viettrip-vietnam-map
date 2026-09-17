// One consistent outline icon family for business cards and map pins.
function businessGlyphPath(category){
  const paths={
    restaurant:'M5 3v7m3-7v7M3 6h7M6.5 10v11M17 3v18m0-18c-4 3-4 9 0 9',
    stay:'M3 20V7h18v13M3 14h18M7 10h3m4 0h3M6 20v-3m12 3v-3',
    spa:'M12 21C3 18 2 11 4 8c4 0 7 4 8 8 1-4 4-8 8-8 2 3 1 10-8 13ZM12 15c-4-4-4-8 0-12 4 4 4 8 0 12',
    cafe:'M4 5h12v9a5 5 0 0 1-10 0V5m10 1h2a3 3 0 0 1 0 6h-2M3 21h17',
    karaoke:'m9 14 5-5M6 17l-3 4m5-7-3 3 3 3 3-3m0-13a5 5 0 1 1 7 7l-7-7Z',
    shopping:'M4 8h16l-1 13H5L4 8Zm4 0V6a4 4 0 0 1 8 0v2',
    bar:'M4 3h16l-8 10L4 3Zm8 10v8m-5 0h10'
  };
  return paths[category]||'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0';
}
function businessGlyph(category){return `<svg class="businessGlyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${businessGlyphPath(category)}"/></svg>`}
function businessMarkerIcon(category,subcategory,rating,memberBenefit=false,benefitText=''){

  const r=rating==null?null:Number(rating);

  // 등록업체 마커의 메인 색상은 평점이 아니라 업종별로 고정한다.
  // 같은 업종은 평점과 관계없이 항상 같은 색으로 표시.
  const color=categoryRangeColor(category);

  const score=r==null?'':r.toFixed(1);

  const markerBadge = memberBenefit ? `
      <g transform="translate(30,1)">
        <path d="M3 3 H14.6 L18 6.4 V14.2 C18 15.2 17.2 16 16.2 16 H3.8 C2.8 16 2 15.2 2 14.2 V4.8 C2 3.8 2.8 3 3.8 3 Z"
          fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
        <circle cx="13.9" cy="6.8" r="1.3" fill="#fff3df"/>
        <path d="M6.1 12.9 L13.8 6.4" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round"/>
        <circle cx="6.2" cy="7.5" r="1.3" fill="none" stroke="#ffffff" stroke-width="1.4"/>
        <circle cx="13.7" cy="11.7" r="1.3" fill="none" stroke="#ffffff" stroke-width="1.4"/>
      </g>` : '';

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="56" height="62" viewBox="0 0 56 62">
    <defs>
      <filter id="s" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".28"/>
      </filter>
    </defs>

    <g filter="url(#s)" transform="translate(2,4)">
      <path d="M26 2C13.3 2 3 12.3 3 25c0 17.2 23 31 23 31s23-13.8 23-31C49 12.3 38.7 2 26 2z"
        fill="${color}" stroke="#fff" stroke-width="3"/>

      ${markerBadge}

      <circle cx="26" cy="25" r="15.5" fill="rgba(255,255,255,.98)"/>
      <g transform="translate(15,14) scale(.92)" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${businessGlyphPath(category)}"/></g>

      ${score?`
        <rect x="31" y="39" rx="7" ry="7" width="20" height="14"
          fill="#111827" stroke="#fff" stroke-width="1.5"/>
        <text x="41" y="49"
          text-anchor="middle"
          font-size="8.5"
          font-weight="700"
          fill="#fff"
          font-family="Arial,sans-serif">${score}</text>
      `:''}
    </g>
  </svg>`;

  return {
    url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),
    scaledSize:new google.maps.Size(51,57),
    anchor:new google.maps.Point(25.5,55),
    labelOrigin:new google.maps.Point(26,29)
  };
}

function catLabel(id){return CONFIG.categories[id]?.label||id}

function normalizedRestaurantSub(sub=''){
  if(sub==='베트남 로컬')return '베트남';
  if(sub==='고기집' || sub==='해산물')return '기타';
  return sub||'기타';
}

function restaurantTagsOf(place){
  const tags=[...(place?.tags||[])];
  if(place?.subcategory==='고기집' && !tags.includes('고기·구이'))tags.push('고기·구이');
  if(place?.subcategory==='해산물' && !tags.includes('해산물'))tags.push('해산물');
  return [...new Set(tags)];
}

function hasRestaurantTag(place,tag){
  if(tag==='all')return true;
  return restaurantTagsOf(place).includes(tag);
}

function restaurantTagsHtml(place){
  if(place?.category!=='restaurant')return '';
  return restaurantTagsOf(place)
    .map(t=>`<span class="restaurantTagBadge">${esc(t)}</span>`)
    .join('');
}

function renderRestaurantTagChoices(selected=[]){
  const box=$('#restaurantTagOptions');
  const field=$('#restaurantTagField');
  if(!box || !field)return;

  const isRestaurant=$('#pCat')?.value==='restaurant';
  field.classList.toggle('hiddenField',!isRestaurant);
  if($('#pSubLabel'))$('#pSubLabel').textContent=isRestaurant?'음식 종류':'세부분류';

  if(!isRestaurant){
    box.innerHTML='';
    return;
  }

  const selectedSet=new Set(selected||[]);
  box.innerHTML=RESTAURANT_TAGS.map(tag=>`
    <label class="tagChoice">
      <input type="checkbox" value="${esc(tag)}" ${selectedSet.has(tag)?'checked':''}>
      <span>${esc(tag)}</span>
    </label>
  `).join('');
}

function selectedRestaurantTags(){
  if($('#pCat')?.value!=='restaurant')return [];
  return [...document.querySelectorAll('#restaurantTagOptions input:checked')].map(x=>x.value);
}

function inferRestaurantTags(name=''){
  const n=String(name||'').toLowerCase();
  const tags=[];
  if(/bbq|barbecue|grill|yakiniku|焼肉|nướng|nuong|steak|삼겹|갈비/.test(n))tags.push('고기·구이');
  if(/seafood|hải sản|hai san|해산물/.test(n))tags.push('해산물');
  if(/vegetarian|vegan|chay|채식/.test(n))tags.push('채식');
  if(/omakase|오마카세/.test(n))tags.push('오마카세');
  if(/brunch|브런치/.test(n))tags.push('브런치');
  return [...new Set(tags)];
}

function tier(r){return r>=4.8?'best':r>=4.6?'good':''}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function stats(placeId){
  const data=db();
  const place=data.places.find(p=>p.id===placeId);
  const rs=data.reviews.filter(r=>r.placeId===placeId);
  const values=rs.filter(r=>r.rating!=null).map(r=>Number(r.rating)).filter(r=>Number.isFinite(r)&&r>=1&&r<=5);
  if(place?.initialRating!=null && Number.isFinite(Number(place.initialRating))) values.unshift(Number(place.initialRating));
  const reviews=rs.filter(r=>String(r.text||'').trim()).reverse();
  if(!values.length)return {rating:null,count:0,reviews};
  return {rating:values.reduce((a,b)=>a+b,0)/values.length,count:values.length,reviews};
}

function isBenefitPlace(place){
  return !!(place && place.memberBenefit);
}
function matchesBenefitFilter(place,filter){
  if(filter==='all')return true;
  if(filter==='benefit')return isBenefitPlace(place);
  return true;
}
function benefitBadgeText(place){
  return isBenefitPlace(place) ? '혜택업소' : '';
}
function benefitInlineBadgeHtml(place){
  return isBenefitPlace(place) ? '<span class="badge benefitPlace">혜택업소</span>' : '';
}
function benefitInfoLabel(place){
  return isBenefitPlace(place) ? '혜택업소' : '회원혜택';
}

function matchesRatingFilter(rating,filter){
  if(filter==='all')return true;
  if(rating==null || !Number.isFinite(Number(rating)))return false;

  const r=Number(rating);
  if(filter==='1')return r>=1 && r<2;
  if(filter==='2')return r>=2 && r<3;
  if(filter==='3')return r>=3 && r<4;
  if(filter==='4')return r>=4 && r<4.5;

  // "4.5+"는 의미 그대로 4.5 이상 전체를 포함한다.
  // 따라서 5.0 업체도 4.5+ 필터에서 보여야 한다.
  if(filter==='4.5')return r>=4.5;

  // 5★는 정확히 5.0만 별도로 볼 수 있게 유지.
  if(filter==='5')return Math.abs(r-5)<0.001;
  return true;
}


function ratingFilterPlaces(filter=state.ratingFilter){
  // 목록과 지도 이동은 동일한 도시·분류·검색·혜택 조건을 사용한다.
  return items({ratingFilter:filter}).filter(p=>validMapLocation(p));
}

function benefitFilterPlaces(filter=state.benefitFilter){
  return items().filter(p=>matchesBenefitFilter(p,filter)).filter(p=>validMapLocation(p));
}

async function focusBenefitFilterResults(filter=state.benefitFilter){
  if(!state.map)return;

  const visible=benefitFilterPlaces(filter);
  closeSystemInfo();
  const filterLabel='혜택업소';

  if(!visible.length){
    fitSelectedCityView(state.city);
    setDbStatus(`${filterLabel}가 없습니다.`,false);
    return;
  }

  if(visible.length===1){
    const p=visible[0];
    state.selected=p.id;
    await focusRangeLocation({lat:Number(p.lat),lng:Number(p.lng)},2.4);
    renderDetail();
    setDbStatus(`${filterLabel} 1곳`,true);
    return;
  }

  const bounds=new google.maps.LatLngBounds();
  visible.forEach(p=>bounds.extend({lat:Number(p.lat),lng:Number(p.lng)}));

  const center=bounds.getCenter();
  const centerPos={lat:center.lat(),lng:center.lng()};
  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
  const token=state.rangeMoveAnimationToken;

  await smoothPanToPosition(centerPos,430,token);
  if(state.rangeMoveAnimationToken!==token)return;
  await smoothFitBounds(bounds,{padding:90,maxZoom:15.5,duration:560});
  setDbStatus(`${filterLabel} ${visible.length}곳`,true);
}

async function focusRatingFilterResults(filter=state.ratingFilter){
  if(!state.map)return;

  const visible=ratingFilterPlaces(filter);
  closeSystemInfo();

  if(!visible.length){
    setDbStatus(`${filter}★ 평점 업체가 없습니다.`,false);
    return;
  }

  if(visible.length===1){
    const p=visible[0];
    state.selected=p.id;

    await focusRangeLocation(
      {lat:Number(p.lat),lng:Number(p.lng)},
      2.4
    );

    renderDetail();
    setDbStatus(`${filter}★ 업체 1곳`,true);
    return;
  }

  const bounds=new google.maps.LatLngBounds();
  visible.forEach(p=>bounds.extend({
    lat:Number(p.lat),
    lng:Number(p.lng)
  }));

  const center=bounds.getCenter();
  const centerPos={lat:center.lat(),lng:center.lng()};

  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
  const token=state.rangeMoveAnimationToken;

  await smoothPanToPosition(centerPos,430,token);
  if(state.rangeMoveAnimationToken!==token)return;

  await smoothFitBounds(bounds,{padding:90,maxZoom:15.5,duration:560});
  setDbStatus(`${filter}★ 업체 ${visible.length}곳`,true);
}


function resetIndependentBusinessFilters({clearSearch=true}={}){
  state.ratingFilter='all';
  state.benefitFilter='all';

  if(clearSearch){
    state.query='';
    if($('#searchInput'))$('#searchInput').value='';
    clearSearchMarker();
  }

  renderRatingFilterState();
}

function renderRatingFilterState(){
  document.querySelectorAll('[data-rating-filter]').forEach(btn=>{
    btn.classList.toggle('active',state.ratingFilter===btn.dataset.ratingFilter);
  });
  document.querySelectorAll('[data-benefit-filter]').forEach(btn=>{
    btn.classList.toggle('active',state.benefitFilter===btn.dataset.benefitFilter);
    btn.setAttribute('aria-pressed',String(state.benefitFilter===btn.dataset.benefitFilter));
  });
}

function items({ratingFilter=state.ratingFilter}={}){
  let arr=placesForCurrentCity()
    .filter(p=>CONFIG.categories[p.category] && p.subcategory!=='프라이빗 룸')
    .map(p=>({...p,...stats(p.id)}));
  arr=arr.filter(matchesNavigationScope);
  if(state.cat!=='all')arr=arr.filter(p=>p.category===state.cat);
  if(state.sub!=='all')arr=arr.filter(p=>normalizedRestaurantSub(p.subcategory)===state.sub || p.subcategory===state.sub);
  if(state.cat==='restaurant' && state.restaurantTag!=='all')arr=arr.filter(p=>hasRestaurantTag(p,state.restaurantTag));
  if(ratingFilter!=='all')arr=arr.filter(p=>matchesRatingFilter(p.rating,ratingFilter));
  if(state.benefitFilter!=='all')arr=arr.filter(p=>matchesBenefitFilter(p,state.benefitFilter));
  if(state.query){const q=state.query.toLowerCase();arr=arr.filter(p=>`${p.name} ${p.area} ${p.address} ${p.subcategory} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(q))}
  if(state.sort==='newest')arr.sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)||a.name.localeCompare(b.name,'ko'));
  else if(state.sort==='reviews')arr.sort((a,b)=>b.reviews.length-a.reviews.length);
  else if(state.sort==='name')arr.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  else arr.sort((a,b)=>(b.rating??-1)-(a.rating??-1)||b.count-a.count);
  return arr;
}

function clearSearchMarker(){
  if(state.searchMarker){
    state.searchMarker.setMap(null);
    state.searchMarker=null;
  }
  state.searchCandidate=null;
}


function findRegisteredMatchForSearch(candidate){
  if(!candidate)return null;

  const nameKey=normalizePlaceName(candidate.name||'');
  const point={lat:Number(candidate.lat),lng:Number(candidate.lng)};

  return (db().places||[]).find(p=>{
    const sameName=nameKey && normalizePlaceName(p.name||'')===nameKey;
    if(!sameName)return false;

    const d=geoDistanceMeters(
      point,
      {lat:Number(p.lat),lng:Number(p.lng)}
    );
    return Number.isFinite(d) && d<=80;
  }) || null;
}

function openSearchResultRegistration(){
  const candidate=state.searchCandidate;
  if(!candidate){
    alert('검색 결과 정보를 다시 찾지 못했습니다. 다시 검색해주세요.');
    return;
  }

  const existing=findRegisteredMatchForSearch(candidate);
  if(existing){
    state.selected=existing.id;
    closeSystemInfo();
    selectPlace(existing.id,true,false);
    setDbStatus('이미 등록된 업체입니다.',true);
    return;
  }

  closeSystemInfo();
  closeEditMode();

  state.clickLatLng={
    lat:Number(candidate.lat),
    lng:Number(candidate.lng)
  };

  openPlace({
    name:candidate.name||'',
    address:candidate.address||'',
    latLng:state.clickLatLng,
    types:candidate.types||[]
  });

  if($('#addressLookupStatus')){
    $('#addressLookupStatus').innerHTML='<b style="color:#0b8f52">Google 지도에서 불러옴</b> · 상호명·주소·위치를 자동 입력했습니다.';
  }

  if($('#selectedMapPlace')){
    $('#selectedMapPlace').innerHTML=`<b>${esc(candidate.name||'업체')}</b><br>${esc(candidate.address||'주소 정보 없음')}`;
  }

  setDbStatus('검색 결과를 업체 등록창으로 불러왔습니다.',true);
}
window.openSearchResultRegistration=openSearchResultRegistration;

function openRegisteredSearchResult(placeId){
  closeSystemInfo();
  selectPlace(placeId,true,false);
}
window.openRegisteredSearchResult=openRegisteredSearchResult;

function searchMap(){
  cancelPendingMapWork();
  const searchActionToken=state.mapActionToken;
  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  state.selectedNavItem=null;
  state.restaurantTag='all';
  state.ratingFilter='all';
  state.benefitFilter='all';
  renderRatingFilterState();

  const q=$('#searchInput').value.trim();

  if(!q){
    state.query='';
    state.cat='all';
    state.sub='all';
    state.navCategory=null;
    state.ratingFilter='all';
    state.benefitFilter='all';
    renderRatingFilterState();
    clearSearchMarker();
    renderAll();
    renderHierarchyNav();
    return;
  }

  // 1) 우리 DB 전체에서 먼저 검색: 현재 필터와 무관하게 찾음
  const all=db().places;
  const ql=q.toLowerCase();
  const matches=all.filter(p=>
    `${p.name||''} ${p.area||''} ${p.address||''} ${p.subcategory||''}`.toLowerCase().includes(ql)
  );

  if(matches.length){
    matches.sort((a,b)=>{
      const ae=(a.name||'').toLowerCase()===ql ? 1 : 0;
      const be=(b.name||'').toLowerCase()===ql ? 1 : 0;
      return be-ae;
    });

    const p=matches[0];
    const matchedCity=placeCityKey(p);

    if(matchedCity && CITY_DATA[matchedCity]){
      state.city=matchedCity;
      state.areaType='all';
      renderCityControls();
      renderAreaList();
      renderPopularAreas();
    }

    state.cat='all';
    state.sub='all';
    state.navCategory=null;
    state.query=q;
    state.selected=p.id;
    clearSearchMarker();

    renderAll();
    renderHierarchyNav();
    selectPlace(p.id,true,true);
    return;
  }

  // 2) 우리 DB에 없으면 Google Maps에서 이름 검색
  state.query='';
  state.cat='all';
  state.sub='all';
  state.navCategory=null;
  renderAll();
  renderHierarchyNav();

  if(!state.map || !google.maps.places || !google.maps.places.PlacesService){
    alert('검색 결과가 없습니다.');
    return;
  }

  const service=new google.maps.places.PlacesService(state.map);
  const city=currentCity()?.label || 'Vietnam';
  service.findPlaceFromQuery({
    query:`${q}, ${city}, Vietnam`,
    fields:['name','formatted_address','geometry','place_id','types']
  },(results,status)=>{
    if(state.mapActionToken!==searchActionToken)return;
    if(status!==google.maps.places.PlacesServiceStatus.OK || !results?.length){
      alert('검색 결과가 없습니다.');
      return;
    }

    const place=results[0];
    const loc=place.geometry?.location;
    if(!loc)return;

    clearSearchMarker();

    const pos={lat:loc.lat(),lng:loc.lng()};
    state.searchCandidate={
      placeId:place.place_id||'',
      name:place.name||q,
      address:place.formatted_address||'',
      lat:pos.lat,
      lng:pos.lng,
      types:place.types||[]
    };

    state.searchMarker=new google.maps.Marker({
      map:state.map,
      position:loc,
      title:place.name,
      zIndex:9998
    });

    cancelPendingMapWork();
    focusLocationAtZoom(pos,17);

    const existing=findRegisteredMatchForSearch(state.searchCandidate);
    const actionHtml=existing
      ? `<div style="margin-top:9px"><button type="button" class="btn primary" style="padding:8px 12px;font-size:12px" onclick="openRegisteredSearchResult('${existing.id}')">등록된 업체 보기</button></div>`
      : `<div style="margin-top:9px"><button type="button" class="btn primary" style="padding:8px 12px;font-size:12px" onclick="openSearchResultRegistration()">이 업체 등록</button></div>`;

    showClickInfo(
      pos,
      infoHtml(
        place.name||q,
        'Google 지도 검색 결과',
        place.formatted_address||'',
        `<div style="font-size:11px;color:#64748b;margin-top:6px">${existing?'이미 등록된 업체와 일치합니다.':'아직 우리 업체 DB에 등록되지 않은 장소입니다.'}</div>${actionHtml}`,
        place.formatted_address||'',
        true
      ),
      state.searchMarker
    );
  });
}

function renderCats(){
  if(state.cat!=='all' && !CONFIG.categories[state.cat]){
    state.cat='all';
    state.sub='all';
  }

  const cats=[['all','전체'],...Object.entries(CONFIG.categories).map(([id,v])=>[id,v.label])];
  $('#cats').innerHTML=cats.map(([id,l])=>`<button class="chip ${state.cat===id?'active':''}" data-cat="${id}">${l}</button>`).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
    resetIndependentBusinessFilters();
    state.navCategory=null;
    state.selectedNavItem=null;
    if(b.dataset.cat==='all'){
      cancelPendingMapWork();
      clearSelectionRanges();
      clearSelectedSystemIcons();
      state.cat='all';state.sub='all';
      renderAll();
    }else focusBusinessCategory(b.dataset.cat,'all');
    renderHierarchyNav();
  });
  if(state.cat==='all')$('#subs').innerHTML='';
  else{
    const cfg=CONFIG.categories[state.cat];
    const subs=['전체',...(cfg?.subs||[])];
    $('#subs').innerHTML=subs.map((s,i)=>`<button class="chip subchip ${state.sub===(i===0?'all':s)?'active':''}" data-sub="${i===0?'all':s}">${s}</button>`).join('');
    document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{
      resetIndependentBusinessFilters();
      state.selectedNavItem=null;
      focusBusinessCategory(state.cat,b.dataset.sub);
      renderHierarchyNav();
    });
  }
}
function renderList(){
  const arr=items();$('#count').textContent=state.sharedDbLoading && !arr.length?'업체 불러오는 중…':`${arr.length}개 업체`;
  $('#list').innerHTML=arr.length
    ? arr.map(p=>`<article class="card ${tier(p.rating)} ${state.selected===p.id?'active':''}" data-id="${p.id}"><div class="cardtop"><div><button type="button" class="name businessReviewName" data-place-reviews="${esc(p.id)}" aria-label="${esc(p.name)} 후기 보기">${esc(p.name||'업체명 미입력')}<span class="reviewNameHint">후기 보기 ›</span></button><div class="badges"><span class="badge main">${businessGlyph(p.category)} ${catLabel(p.category)}</span><span class="badge">${esc(p.category==='restaurant'?normalizedRestaurantSub(p.subcategory):p.subcategory)}</span>${restaurantTagsHtml(p)}${benefitInlineBadgeHtml(p)}</div></div><div class="rating">${p.rating==null?'—':p.rating.toFixed(1)}<small>${p.count} 평가</small></div></div><div class="meta"><span>${esc(p.area||'')}</span><span>${esc(p.address||'')}</span></div></article>`).join('')
    : state.sharedDbLoading
      ? '<div class="empty"><b>공용 업체 불러오는 중…</b><br>잠시만 기다려주세요.</div>'
      : '<div class="empty">현재 조건에 맞는 업체가 없습니다.<br>업종·평점·혜택 조건을 조정해 보세요.</div>';
  document.querySelectorAll('[data-id]').forEach(el=>el.onclick=(event)=>{
    if(event.target.closest('[data-place-reviews]'))return;
    closeMobileBusinessList();
    selectPlace(el.dataset.id,true);
  });
  renderRatingFilterState();
  syncMobileListCount();
}
function ratingStyle(r){
  if(r==null)return {color:'#94a3b8',scale:14,z:10,level:0};

  // 평균 평점을 1~5점 구간으로 시각화
  // 1.x = 1점, 2.x = 2점 ... 4.x = 4점, 5.0 = 5점
  const level=Math.max(1,Math.min(5,Math.floor(Number(r))));

  const styles={
    1:{color:'#dc2626',scale:12,z:20},   // 빨강
    2:{color:'#f97316',scale:13,z:25},   // 주황
    3:{color:'#eab308',scale:14,z:30},   // 노랑
    4:{color:'#16a34a',scale:16,z:40},   // 초록
    5:{color:'#d4a017',scale:19,z:50}    // 금색
  };

  return {...styles[level],level};
}

function clearPremiumEffects(){
  if(state.premiumPulseTimer){
    clearInterval(state.premiumPulseTimer);
    state.premiumPulseTimer=null;
  }
  (state.premiumCircles||[]).forEach(x=>x.circle?.setMap(null));
  state.premiumCircles=[];
}

function addPremiumEffect(position,index=0){
  const circle=new google.maps.Circle({
    map:state.map,
    center:position,
    radius:24,
    fillColor:'#f5c542',
    fillOpacity:.08,
    strokeColor:'#d4a017',
    strokeOpacity:.5,
    strokeWeight:1.5,
    clickable:false,
    zIndex:5
  });
  state.premiumCircles.push({circle,phase:(index%8)*.45});
}

function startPremiumPulse(){
  if(!state.premiumCircles.length || state.premiumPulseTimer)return;
  let t=0;
  state.premiumPulseTimer=setInterval(()=>{
    t+=0.13;
    state.premiumCircles.forEach((x,i)=>{
      const wave=(Math.sin(t+x.phase)+1)/2;
      x.circle.setRadius(22+wave*18);
      x.circle.setOptions({
        fillOpacity:.035+wave*.055,
        strokeOpacity:.24+wave*.36
      });
    });
  },90);
}
