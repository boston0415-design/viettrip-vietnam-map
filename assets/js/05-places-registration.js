function reverseGeocodeLatLng(latLng){
  return new Promise(resolve=>{
    if(!google.maps.Geocoder){
      resolve('');
      return;
    }

    const geocoder=new google.maps.Geocoder();
    geocoder.geocode({location:latLng,region:'VN'},(results,status)=>{
      resolve(
        status==='OK' && results?.[0]?.formatted_address
          ? results[0].formatted_address
          : ''
      );
    });
  });
}

function isBusinessLikePlace(place){
  const types=new Set(place?.types||[]);
  const accepted=[
    'establishment','point_of_interest','restaurant','food','cafe','bar',
    'night_club','lodging','spa','shopping_mall','store','supermarket',
    'hospital','tourist_attraction','golf_course','gym','beauty_salon'
  ];
  return accepted.some(t=>types.has(t));
}

function findNearbyBusiness(latLng,maxMeters=28){
  return new Promise(resolve=>{
    if(!state.map || !google.maps.places?.PlacesService){
      resolve(null);
      return;
    }

    const svc=new google.maps.places.PlacesService(state.map);
    svc.nearbySearch(
      {location:latLng,radius:40},
      (results,status)=>{
        if(status!==google.maps.places.PlacesServiceStatus.OK || !results?.length){
          resolve(null);
          return;
        }

        const clickPoint={
          lat:typeof latLng.lat==='function'?latLng.lat():Number(latLng.lat),
          lng:typeof latLng.lng==='function'?latLng.lng():Number(latLng.lng)
        };

        const candidates=results
          .filter(isBusinessLikePlace)
          .map(p=>{
            const loc=p.geometry?.location;
            const point=loc?{lat:loc.lat(),lng:loc.lng()}:null;
            return {
              place:p,
              distance:point?geoDistanceMeters(clickPoint,point):Infinity
            };
          })
          .filter(x=>x.distance<=maxMeters)
          .sort((a,b)=>a.distance-b.distance);

        resolve(candidates[0]?.place||null);
      }
    );
  });
}

async function openRegistrationFromGooglePlace(place,fallbackLatLng){
  const loc=place?.geometry?.location || fallbackLatLng;
  const address=place?.formatted_address || place?.vicinity || '';
  const name=businessNameFromGooglePlace(place);

  openPlace({
    name,
    address,
    latLng:loc,
    types:place?.types||[]
  });

  if(name){
    $('#addressLookupStatus').innerHTML='<b style="color:#0b8f52">Google 업체 확인 완료</b> · 상호명과 주소를 자동 입력했습니다.';
    $('#selectedMapPlace').innerHTML=`<b>${esc(name)}</b><br>${esc(address||'주소 정보 없음')}`;
  }else{
    $('#addressLookupStatus').innerHTML='<b style="color:#b45309">위치 확인 완료</b> · 주소는 자동 입력했습니다. 업체명만 확인해주세요.';
  }
}

async function registerGooglePlace(placeId,latLng){
  const token=(state.registerLookupToken||0)+1;
  state.registerLookupToken=token;
  state.clickLatLng={
    lat:typeof latLng.lat==='function'?latLng.lat():Number(latLng.lat),
    lng:typeof latLng.lng==='function'?latLng.lng():Number(latLng.lng)
  };

  $('#regHint').textContent='업체 이름과 주소 확인 중…';

  let place=await getGooglePlaceDetails(placeId);
  if(state.registerLookupToken!==token)return;

  if(place){
    await openRegistrationFromGooglePlace(place,latLng);
    return;
  }

  // POI 상세 조회가 실패하면 클릭 지점 바로 근처 업체를 한 번 더 확인.
  const nearby=await findNearbyBusiness(latLng,28);
  if(state.registerLookupToken!==token)return;

  if(nearby?.place_id){
    const detailed=await getGooglePlaceDetails(nearby.place_id);
    if(state.registerLookupToken!==token)return;
    if(detailed){
      await openRegistrationFromGooglePlace(detailed,latLng);
      return;
    }
  }

  const address=await reverseGeocodeLatLng(latLng);
  if(state.registerLookupToken!==token)return;

  openPlace({
    name:'',
    address,
    latLng
  });

  $('#addressLookupStatus').innerHTML=address
    ? '<b style="color:#0b8f52">주소 자동 입력 완료</b> · 업체명을 입력해주세요.'
    : '<b style="color:#b45309">위치 선택 완료</b> · 업체명과 주소를 확인해주세요.';
}

async function registerMapClick(event){
  if(!state.registerMode || !event?.latLng)return;

  if(event.placeId && event.stop)event.stop();

  $('#regHint').textContent='업체 정보 확인 중… · ESC 취소';

  if(event.placeId){
    await registerGooglePlace(event.placeId,event.latLng);
    return;
  }

  // placeId가 없는 지도 클릭도 근처 업체를 찾아 자동 입력을 시도.
  const token=(state.registerLookupToken||0)+1;
  state.registerLookupToken=token;

  const nearby=await findNearbyBusiness(event.latLng,28);
  if(state.registerLookupToken!==token)return;

  if(nearby?.place_id){
    const details=await getGooglePlaceDetails(nearby.place_id);
    if(state.registerLookupToken!==token)return;
    if(details){
      await openRegistrationFromGooglePlace(details,event.latLng);
      return;
    }
  }

  const address=await reverseGeocodeLatLng(event.latLng);
  if(state.registerLookupToken!==token)return;

  openPlace({
    name:'',
    address,
    latLng:event.latLng
  });

  $('#addressLookupStatus').innerHTML=address
    ? '<b style="color:#0b8f52">주소 자동 입력 완료</b> · 상호명만 입력해주세요.'
    : '<b style="color:#b45309">위치 선택 완료</b> · 업체명과 주소를 확인해주세요.';
}


const CITY_PLACE_ALIASES={
  hcmc:['호치민','ho chi minh','hồ chí minh','saigon','sài gòn'],
  hanoi:['하노이','hanoi','hà nội'],
  danang:['다낭','da nang','đà nẵng'],
  nhatrang:['나트랑','nha trang'],
  phuquoc:['푸꾸옥','phu quoc','phú quốc'],
  dalat:['달랏','da lat','đà lạt'],
  hoian:['호이안','hoi an','hội an'],
  vungtau:['붕따우','붕타우','vung tau','vũng tàu','ho tram','hồ tràm'],
  muine:['무이네','mui ne','mũi né','phan thiet','phan thiết']
};

function validMapLocation(p){
  if(p?.lat==null || p?.lng==null || String(p.lat).trim()==='' || String(p.lng).trim()==='')return null;
  const lat=Number(p.lat),lng=Number(p.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
}

function geoDistanceMeters(a,b){
  const lat1=Number(a?.lat),lng1=Number(a?.lng),lat2=Number(b?.lat),lng2=Number(b?.lng);
  if(![lat1,lng1,lat2,lng2].every(Number.isFinite))return Infinity;

  const R=6371000;
  const toRad=v=>v*Math.PI/180;
  const dLat=toRad(lat2-lat1);
  const dLng=toRad(lng2-lng1);
  const s1=Math.sin(dLat/2);
  const s2=Math.sin(dLng/2);
  const h=s1*s1+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2*s2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}

function explicitPlaceCityKey(place){
  const hay=`${place?.area||''} ${place?.address||''}`.toLowerCase();
  if(!hay.trim())return null;

  const matches=Object.entries(CITY_PLACE_ALIASES)
    .filter(([key,aliases])=>aliases.some(alias=>hay.includes(alias.toLowerCase())))
    .map(([key])=>key);
  const pos=validMapLocation(place);
  if(pos)matches.sort((a,b)=>geoDistanceMeters(pos,CITY_DATA[a].center)-geoDistanceMeters(pos,CITY_DATA[b].center));
  // A new province/city name can coexist with the more specific travel destination.
  else if(matches.includes('hoian'))return 'hoian';
  return matches[0]||null;
}

function nearestCityKeyForLatLng(lat,lng){
  const point={lat:Number(lat),lng:Number(lng)};
  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng))return null;

  let bestKey=null;
  let bestDistance=Infinity;

  Object.entries(CITY_DATA).forEach(([key,city])=>{
    const d=geoDistanceMeters(point,city.center);
    if(d<bestDistance){
      bestDistance=d;
      bestKey=key;
    }
  });

  return bestKey;
}

function placeCityKey(place){
  return explicitPlaceCityKey(place)
    || nearestCityKeyForLatLng(place?.lat,place?.lng)
    || null;
}

function placeInCity(place,cityKey=state.city){
  return !!place && placeCityKey(place)===cityKey;
}

function placesForCurrentCity(){
  return db().places.filter(p=>placeInCity(p,state.city));
}

function currentCity(){return CITY_DATA[state.city]||CITY_DATA.hcmc}
function extraCity(){return EXTRA_DATA[state.city]||{zones:[],points:[]}}
function currentAreas(){return [...(currentCity().areas||[]),...(extraCity().zones||[])]}
function currentGolf(){return currentCity().golf||[]}
function currentPoints(){return extraCity().points||[]}
function normalizeAreaType(a){
  const t=String(a.type||'');
  if(t.includes('시장'))return '시장';
  if(t.includes('거리')||t.includes('구시가지')||t.includes('밤거리'))return '거리';
  if(t==='한인생활권')return '한인생활권';
  return '관광명소';
}


function poiColor(type){
  return ({
    '공항':'#2563eb',
    '터미널':'#0ea5e9',
    '그랩승차':'#16a34a',
    '택시승차':'#f59e0b',
    '전철역':'#6366f1',
    '기차역':'#4f46e5',
    '한인생활권':'#16a34a',
    '병원':'#dc2626',
    '쇼핑':'#db2777'
  })[type]||'#475569';
}
function poiSvg(type,label,hover=false){
  const color=poiColor(type);
  const categories={'공항':'airport','터미널':'airport','그랩승차':'taxi','택시승차':'taxi','전철역':'train','기차역':'train','한인생활권':'home','병원':'hospital','쇼핑':'shopping'};
  return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${hover?'#f0f9ff':'#fff'}" stroke="${color}" stroke-width="1.6"/><g transform="translate(9,9) scale(.92)" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${businessGlyphPath(categories[type]||'attraction')}"/></g></svg>`),scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)};
}

// One information layout for registered places, system POIs and geographic ranges.
function mapFeatureHtml(feature={},radius=null){
  const name=feature.name||feature.label||'선택한 위치';
  const type=feature.type||(feature.category?catLabel(feature.category):'위치 정보');
  const description=feature.description||feature.desc||'등록된 상세 설명이 없습니다.';
  const address=feature.address||feature.formatted_address||'';
  const pos=validMapLocation(feature.center||feature);
  const locationText=address|| (pos?`좌표 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} · 상세 주소 미등록`:'개별 도로명 주소가 없는 구역입니다.');
  const rangeText=radius?`<p class="mapInfoRange">중심에서 반경 ${Math.round(radius).toLocaleString('ko-KR')}m의 주변 참고 범위입니다. 실제 부지·행정 경계가 아닙니다.</p>`:'';
  const benefit=feature.memberBenefit?`<p class="mapInfoBenefit">회원 혜택 · ${esc(feature.benefitText||'상세 혜택은 업체에 확인해주세요.')}</p>`:'';
  return `<section class="mapFeatureInfo"><strong>${esc(name)}</strong><small>${esc(type)}</small><p>${esc(description)}</p><p class="mapInfoAddress">${esc(locationText)}</p>${rangeText}${benefit}</section>`;
}
function showPositionHover(position,html){
  const info=hoverInfo();info.setContent(html);info.setPosition(position);
  info.open({map:state.map,shouldFocus:false});
}
function bindMapFeatureInfo(target,feature,position,radius=null,{click=true}={}){
  const html=()=>mapFeatureHtml(feature,radius);
  target.addListener('mouseover',event=>showPositionHover(event?.latLng||position,html()));
  target.addListener('mouseout',hideHover);
  if(click)target.addListener('click',event=>{hideHover();showClickInfo(event?.latLng||position,html());});
}

function hoverInfo(){
  if(!state.hoverInfo) state.hoverInfo=new google.maps.InfoWindow({disableAutoPan:true});
  return state.hoverInfo;
}
function showHover(marker,html){
  const info=hoverInfo();
  info.setContent(html);
  info.open({map:state.map,anchor:marker,shouldFocus:false});
}
function hideHover(){
  if(state.hoverInfo) state.hoverInfo.close();
}
function infoHtml(title,type,desc,extra='',copyAddress='',showCopy=false){
  const combined=[title,copyAddress].filter(Boolean).join('\n');
  const copyControls=showCopy
    ? `<div class="infoCopyRow">
        ${copyButtonHtml('이름 복사',title)}
        ${copyAddress?copyButtonHtml('주소 복사',copyAddress):''}
        ${copyAddress?copyButtonHtml('이름+주소',combined):''}
      </div>`
    : '';

  return `<div style="max-width:280px;padding:1px 2px">
    <div style="font-weight:900;font-size:13px">${esc(title||'')}</div>
    ${type?`<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(type)}</div>`:''}
    ${desc?`<div style="font-size:12px;color:#334155;line-height:1.5;margin-top:5px">${esc(desc)}</div>`:''}
    ${extra||''}
    ${copyControls}
  </div>`;
}



function cancelPendingMapWork(){
  state.mapActionToken=(state.mapActionToken||0)+1;
  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
}

function closeSystemInfo(){
  if(state.clickInfo){
    state.clickInfo.close();
    state.clickInfo=null;
  }
  hideHover();
}

function showClickInfo(position,html,anchorMarker=null){
  if(state.clickInfo) state.clickInfo.close();

  // On narrow screens, keep tapped information inside the visible map.
  state.clickInfo=new google.maps.InfoWindow({
    content:html,
    disableAutoPan:!isMobileMapLayout()
  });

  if(anchorMarker){
    state.clickInfo.open({map:state.map,anchor:anchorMarker});
  }else{
    state.clickInfo.setPosition(position);
    state.clickInfo.open({map:state.map});
  }
}


function renderPoiMarkers(){
  state.poiMarkers.forEach(m=>m.setMap(null));
  state.poiMarkers=[];
}

function golfSvg(hover=false){
  return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${hover?'#f0fdf4':'white'}" stroke="#15803d" stroke-width="1.6"/><g transform="translate(8,7)" fill="none" stroke="#15803d" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${businessGlyphPath('golf')}"/></g></svg>`),scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)};
}

function renderGolfCourses(){
  state.golfMarkers.forEach(m=>m.setMap(null));
  state.golfMarkers=[];
}

function fitGolfBounds(){
  const golf=currentGolf();
  if(!state.map || !golf.length)return;
  const b=new google.maps.LatLngBounds();
  golf.filter(g=>Number.isFinite(Number(g.lat))&&Number.isFinite(Number(g.lng))).forEach(g=>b.extend({lat:Number(g.lat),lng:Number(g.lng)}));
  placesForCurrentCity().filter(p=>p.category==='golf').forEach(p=>b.extend({lat:Number(p.lat),lng:Number(p.lng)}));
  if(!b.isEmpty())smoothFitBounds(b,{padding:70,maxZoom:15.5,duration:560});
}

function fillAdmin(){
  $('#pCat').innerHTML=Object.entries(CONFIG.categories).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');
  fillSubs();
}
function fillSubs(){
  $('#pSub').innerHTML=CONFIG.categories[$('#pCat').value].subs.map(s=>`<option>${s}</option>`).join('');
  renderRestaurantTagChoices([]);
}




function normalizedPlaceText(v){
  return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
}

function isLikelyAddressName(name,address='',types=[]){
  const n=normalizedPlaceText(name);
  const a=normalizedPlaceText(address);
  if(!n)return true;

  const addressTypes=new Set([
    'street_address','route','premise','subpremise','intersection',
    'postal_code','locality','administrative_area_level_1',
    'administrative_area_level_2','administrative_area_level_3'
  ]);
  const businessTypes=new Set([
    'establishment','point_of_interest','restaurant','food','cafe',
    'bar','lodging','spa','shopping_mall','store','supermarket',
    'hospital','night_club','tourist_attraction'
  ]);

  if((types||[]).some(t=>businessTypes.has(t)))return false;
  if((types||[]).some(t=>addressTypes.has(t)))return true;

  // Google sometimes returns "545 Trần Hưng Đạo" as place.name.
  if(/^\d{1,6}\s+/.test(String(name||'').trim()))return true;

  const firstAddressPart=a.split(',')[0]?.trim();
  if(firstAddressPart && n===firstAddressPart)return true;

  return false;
}

function businessNameFromGooglePlace(place){
  const name=String(place?.name||'').trim();
  const address=String(place?.formatted_address||'').trim();
  const types=place?.types||[];
  return isLikelyAddressName(name,address,types)?'':name;
}

function setAddressLocation(place){
  if(!place || !place.geometry || !place.geometry.location)return false;

  if(!isPreciseAddressResult(place)){
    state.clickLatLng=null;
    clearAddressSearchMarker();
    $('#addressLookupStatus').textContent='도시·거리의 대략적인 위치만 찾았습니다. 건물 번호를 포함한 주소나 지도상의 업체를 선택해주세요.';
    $('#selectedMapPlace').textContent='정확한 업체 위치를 다시 선택해주세요.';
    return false;
  }

  const loc=place.geometry.location;
  state.clickLatLng={lat:loc.lat(),lng:loc.lng()};

  const address=place.formatted_address || $('#pAddress').value.trim();
  if(address) $('#pAddress').value=address;

  const businessName=businessNameFromGooglePlace(place);
  const currentName=$('#pName').value.trim();

  // 업체 결과일 때만 Google 상호명을 자동 입력.
  // "545 Trần Hưng Đạo" 같은 주소명은 업체명 칸에 넣지 않는다.
  if(businessName && (!currentName || isLikelyAddressName(currentName,address,[]))){
    $('#pName').value=businessName;
  }else if(!businessName && currentName && isLikelyAddressName(currentName,address,[])){
    $('#pName').value='';
  }

  const finalName=$('#pName').value.trim();
  if(finalName){
    $('#addressLookupStatus').innerHTML='<b style="color:#0b8f52">위치 선택 완료</b> · 업체명과 주소를 확인해주세요.';
  }else{
    $('#addressLookupStatus').innerHTML='<b style="color:#b45309">위치 선택 완료</b> · 주소는 확인됐습니다. 위의 업체명에 실제 상호명을 입력해주세요.';
  }

  $('#selectedMapPlace').innerHTML=finalName
    ? `<b>${esc(finalName)}</b><br>${esc(address||'선택한 위치')}`
    : `<b>주소 위치 선택 완료</b><br>${esc(address||'선택한 위치')}<br><span style="color:#b45309">업체명을 입력해주세요.</span>`;

  if(state.addressSearchMarker) state.addressSearchMarker.setMap(null);
  state.addressSearchMarker=new google.maps.Marker({
    map:state.map,
    position:state.clickLatLng,
    zIndex:9990,
    title:finalName||address||'등록 위치'
  });
  bindMapFeatureInfo(state.addressSearchMarker,{name:finalName||'등록 위치',address,type:'등록할 업체',...state.clickLatLng},state.clickLatLng);

  cancelPendingMapWork();
  focusLocationAtZoom(state.clickLatLng,17);
  return true;
}

function isPreciseAddressResult(place){
  const types=place?.types||[];
  return !place?.partial_match && types.some(t=>['street_address','premise','subpremise','establishment','point_of_interest'].includes(t));
}

function invalidateAddressLocation(){
  state.addressLookupToken=(state.addressLookupToken||0)+1;
  state.clickLatLng=null;
  clearAddressSearchMarker();
  $('#findAddressBtn').disabled=false;
  $('#findAddressBtn').textContent='주소로 위치 찾기';
  $('#addressLookupStatus').textContent='주소가 변경되었습니다. 위치를 다시 찾아주세요.';
  $('#selectedMapPlace').textContent='정확한 업체 위치를 다시 선택해주세요.';
}

function initAddressAutocomplete(){
  if(state.addressAutocomplete || !google.maps.places || !google.maps.places.Autocomplete)return;

  const input=$('#pAddress');
  state.addressAutocomplete=new google.maps.places.Autocomplete(input,{
    componentRestrictions:{country:'vn'},
    fields:['name','formatted_address','geometry','place_id','types']
  });

  state.addressAutocomplete.addListener('place_changed',()=>{
    const place=state.addressAutocomplete.getPlace();
    if(!setAddressLocation(place)){
      $('#addressLookupStatus').textContent='추천 주소를 선택하거나 「주소로 위치 찾기」를 눌러주세요.';
    }
  });
}

function findAddressLocation(){
  const address=$('#pAddress').value.trim();
  if(!address){
    $('#addressLookupStatus').textContent='주소를 먼저 입력해주세요.';
    return;
  }
  if(!state.map || !google.maps.Geocoder){
    $('#addressLookupStatus').textContent='Google 지도가 아직 준비되지 않았습니다.';
    return;
  }

  const btn=$('#findAddressBtn');
  btn.disabled=true;
  btn.textContent='찾는 중…';
  $('#addressLookupStatus').textContent='Google 지도에서 주소 위치를 찾고 있습니다.';

  const requestId=state.addressLookupToken=(state.addressLookupToken||0)+1;
  const geocoder=new google.maps.Geocoder();
  geocoder.geocode({address:address, region:'VN',componentRestrictions:{country:'VN'}},(results,status)=>{
    if(state.addressLookupToken!==requestId)return;
    btn.disabled=false;
    btn.textContent='주소로 위치 찾기';
    if(!$('#placeModal').classList.contains('open') || $('#pAddress').value.trim()!==address)return;

    if(status==='OK' && results && results[0]){
      setAddressLocation({
        name:'',
        formatted_address:results[0].formatted_address || address,
        geometry:results[0].geometry,
        types:results[0].types||[],
        partial_match:results[0].partial_match
      });
    }else{
      $('#addressLookupStatus').textContent='주소 위치를 찾지 못했습니다. 베트남 도시명까지 함께 입력해보세요.';
    }
  });
}
