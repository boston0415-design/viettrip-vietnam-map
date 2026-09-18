// One browser-local search origin shared by the map, list and category filters.
(() => {
  const storageKey='viettrip_nearby_stay_v1',radii=[500,1000,3000,5000];
  let savedStay=null,previousCity='hcmc',previousSort='newest',locationToken=0,searchToken=0;
  let circle=null,marker=null,overlayKey='',locationTimer=null,searchTimer=null;
  const byId=id=>document.getElementById(id);
  const active=()=>Boolean(state.nearby);
  const distanceLabel=m=>m<1000?`${Math.round(m)}m`:`${(m/1000).toFixed(1).replace(/\.0$/,'')}km`;
  function cleanPlace(value){
    const point=validMapLocation(value);
    if(!point || typeof value?.name!=='string' || !value.name.trim())return null;
    return {...point,name:value.name.trim().slice(0,180),address:String(value.address||'').slice(0,400)};
  }
  try{
    const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(stored?.expiresAt>Date.now()){const clean=cleanPlace(stored);if(clean)savedStay={...clean,expiresAt:stored.expiresAt}}
    else if(stored)localStorage.removeItem(storageKey);
  }catch{}
  function message(text=''){
    const node=byId('nearbyMessage');if(!node)return;
    node.textContent=text;node.hidden=!text;
  }
  function cancelLocation(){
    locationToken++;clearTimeout(locationTimer);
    byId('nearbyCurrent').disabled=false;
    byId('nearbyCurrent').textContent='현재 위치';
    byId('locBtn').disabled=false;
  }
  function cancelSearch(){
    searchToken++;clearTimeout(searchTimer);
    byId('nearbyStaySearch').disabled=false;
    byId('nearbyStaySearch').textContent='검색';
  }
  function clearOverlays(){
    circle?.setMap(null);marker?.setMap(null);circle=null;marker=null;overlayKey='';
  }
  function sync(){
    const origin=state.nearby;
    byId('areaLegend').classList.add('hasNearbyTools');
    byId('areaLegend').classList.toggle('nearbyActive',Boolean(origin));
    byId('nearbySelection').hidden=!origin;
    byId('nearbyCurrent').setAttribute('aria-pressed',String(origin?.kind==='current'));
    byId('nearbyStay').setAttribute('aria-pressed',String(origin?.kind==='stay'));
    const distanceOption=byId('nearbyDistanceSort');
    distanceOption.hidden=!origin;distanceOption.disabled=!origin;
    if(origin){
      byId('nearbyOrigin').textContent=origin.name;
      byId('nearbyOrigin').title=`${origin.name} · 기준 위치로 이동`;
      byId('nearbyRadius').value=String(origin.radius);
    }
    if(!origin){clearOverlays();return}
    if(!state.map || !window.google?.maps)return;
    const key=JSON.stringify([origin.lat,origin.lng,origin.radius,origin.kind,origin.name]);
    if(key===overlayKey && circle?.getMap?.()===state.map)return;
    clearOverlays();
    circle=new google.maps.Circle({map:state.map,center:origin,radius:origin.radius,fillColor:'#247f78',fillOpacity:.06,strokeColor:'#247f78',strokeOpacity:.65,strokeWeight:1.5,clickable:false,zIndex:0});
    const symbol=origin.kind==='stay'?'<path d="m6 12 6-5 6 5v7h-4v-5h-4v5H6Z"/>':'<circle cx="12" cy="13" r="4"/><path d="M12 5v3m0 10v3M4 13h3m10 0h3" fill="none" stroke="white" stroke-width="2"/>';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="38" viewBox="0 0 24 28"><path d="M12 27S1 19 1 12a11 11 0 0 1 22 0c0 7-11 15-11 15Z" fill="#155e59" stroke="white"/><g fill="white">${symbol}</g></svg>`;
    marker=new google.maps.Marker({map:state.map,position:{lat:origin.lat,lng:origin.lng},title:`${origin.name} · 주변 검색 기준`,zIndex:9999,icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(32,38),anchor:new google.maps.Point(16,38)}});
    marker.addListener('click',fit);overlayKey=key;
  }
  function fit(){
    if(!state.nearby || !state.map)return;
    cancelPendingMapWork();
    fitCircleGeometry(state.nearby,state.nearby.radius,{padding:48,maxZoom:16});
  }
  function apply(place,kind='stay'){
    const clean=cleanPlace(place);if(!clean)return false;
    cancelLocation();cancelSearch();message();
    if(!active()){previousCity=state.city;previousSort=state.sort}
    const def=navDef(state.navCategory);
    const category=def?.kind==='business'?def.id:({shopping:'shopping','market-nav':'market','attraction-nav':'attraction','golf-nav':'golf',hospital:'hospital',pharmacy:'pharmacy'})[def?.id];
    if(category)state.cat=category;
    state.nearby={...clean,kind,radius:state.nearby?.radius||1000};
    state.city='all';state.sort='distance';byId('sort').value='distance';
    state.navCategory=null;state.selectedNavItem=null;state.hospitalSpecialty='all';state.selected=null;state.areaType='all';
    state.query='';byId('searchInput').value='';
    window.PersonalPlaces?.setView('all');
    cancelPendingMapWork();clearSearchMarker();clearSelectionRanges();clearAreaLabels();clearSelectedSystemIcons();
    if(typeof resetAdministrativeRegions==='function')resetAdministrativeRegions();
    closeSystemInfo();closeAreaPanel();closeDetailPanel();setMobileLegendExpanded(false);
    if(byId('nearbyStayDialog').open)byId('nearbyStayDialog').close();
    renderCityControls();renderPopularAreas();renderGolfCourses();renderPoiMarkers();renderAll();fit();
    return true;
  }
  function chooseStay(place){
    if(!apply(place,'stay'))return;
    // Persist the user's own search label, not Google-returned names or addresses.
    savedStay={...cleanPlace({...place,name:place.rememberName||place.name,address:place.rememberName?'':place.address}),expiresAt:place.expiresAt||Date.now()+30*24*60*60*1000};
    try{localStorage.setItem(storageKey,JSON.stringify(savedStay))}
    catch{message('숙소 위치를 이번 화면에 적용했습니다. 이 브라우저에서는 기억할 수 없습니다.')}
  }
  function clear({refresh=true}={}){
    cancelLocation();cancelSearch();message();
    if(active()){state.city=previousCity;state.sort=previousSort;byId('sort').value=previousSort}
    state.nearby=null;clearOverlays();sync();
    if(refresh){cancelPendingMapWork();renderCityControls();renderAll();fitSelectedCityView(state.city)}
  }
  function setRadius(value){
    const radius=Number(value);if(!active()||!radii.includes(radius))return;
    state.nearby.radius=radius;state.selected=null;closeSystemInfo();closeDetailPanel();
    renderAll();fit();
  }
  function current(){
    cancelLocation();message();
    if(!navigator.geolocation?.getCurrentPosition){message('현재 위치를 사용할 수 없습니다. 숙소 지정으로 찾아주세요.');return}
    const token=locationToken;
    byId('nearbyCurrent').disabled=true;byId('nearbyCurrent').textContent='위치 확인 중';byId('locBtn').disabled=true;
    const fail=error=>{
      if(token!==locationToken)return;
      cancelLocation();
      message(error?.code===1?'위치 권한이 꺼져 있습니다. 브라우저에서 허용하거나 숙소를 지정해주세요.':error?.code===3?'위치 확인 시간이 초과되었습니다. 다시 시도하거나 숙소를 지정해주세요.':'현재 위치를 확인하지 못했습니다. 위치 서비스를 켜거나 숙소를 지정해주세요.');
    };
    locationTimer=setTimeout(()=>fail({code:3}),13000);
    try{navigator.geolocation.getCurrentPosition(position=>{
      if(token!==locationToken)return;
      const p=position.coords;
      if(!apply({name:'현재 위치',lat:p.latitude,lng:p.longitude},'current')){fail({code:2});return}
      const accuracy=Number(p.accuracy);
      if(Number.isFinite(accuracy)&&accuracy>200)message(`현재 위치 오차 약 ±${distanceLabel(accuracy)} · 정확하지 않으면 숙소를 지정해주세요.`);
    },fail,{enableHighAccuracy:true,timeout:10000,maximumAge:30000})}catch{fail({code:2})}
  }
  const normalized=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  function localStays(query){
    const terms=normalized(query).split(/\s+/).filter(Boolean);
    return (db().places||[]).filter(p=>p.category==='stay'&&validMapLocation(p)&&terms.every(t=>normalized(`${p.name} ${p.address} ${p.area}`).includes(t)))
      .sort((a,b)=>Number(placeInCity(b,previousCity))-Number(placeInCity(a,previousCity))||String(a.name).localeCompare(String(b.name),'ko')).slice(0,8);
  }
  function renderChoices(places,source){
    const box=byId('nearbyStayResults');box.replaceChildren();
    places.forEach(p=>{
      const clean=cleanPlace(p);if(!clean)return;
      const button=document.createElement('button');button.type='button';button.className='nearbyStayResult';
      const name=document.createElement('strong'),address=document.createElement('span'),label=document.createElement('small');
      name.textContent=clean.name;address.textContent=clean.address||'주소 정보 없음';label.textContent=`${source} · 이 위치에서 찾기`;
      button.append(name,address,label);button.addEventListener('click',()=>chooseStay({...clean,rememberName:p.rememberName,expiresAt:p.expiresAt}));box.append(button);
      for(const html of p.attributions||[]){
        const document=new DOMParser().parseFromString(html,'text/html');
        for(const source of document.querySelectorAll('a[href]')){
          const href=source.getAttribute('href');if(!/^https?:\/\//i.test(href))continue;
          const link=window.document.createElement('a');link.href=href;link.textContent=source.textContent;link.target='_blank';link.rel='noopener noreferrer';link.className='nearbyProviderCredit';box.append(link);
        }
      }
    });
  }
  function showLocalStays(){
    cancelSearch();
    const query=byId('nearbyStayQuery').value.trim();
    const places=localStays(query);renderChoices(places,'등록 숙소');
    byId('nearbyStayStatus').textContent=places.length?'주소를 확인하고 숙소를 선택해주세요. 없으면 검색을 눌러 찾아보세요.':'숙소 이름과 도시 또는 주소를 입력한 뒤 검색을 눌러주세요.';
    byId('nearbyGoogleCredit').hidden=true;
  }
  function openStay(){
    cancelLocation();message();
    if(!active())previousCity=state.city;
    const dialog=byId('nearbyStayDialog');
    if(savedStay?.expiresAt<=Date.now()){savedStay=null;try{localStorage.removeItem(storageKey)}catch{}}
    byId('nearbySavedStay').hidden=!savedStay;
    byId('nearbySavedName').textContent=savedStay?.name||'';
    byId('nearbySavedAddress').textContent=savedStay?.address||'';
    byId('nearbyStayQuery').value='';showLocalStays();
    dialog.showModal();byId('nearbyStayQuery').focus();
  }
  function searchStay(event){
    event?.preventDefault();
    if(byId('nearbyStaySearch').disabled)return;
    cancelSearch();
    const query=byId('nearbyStayQuery').value.trim();
    if(query.length<2){byId('nearbyStayStatus').textContent='숙소 이름 또는 주소를 두 글자 이상 입력해주세요.';return}
    if(!state.map || !window.google?.maps?.places?.PlacesService){byId('nearbyStayStatus').textContent='지도 검색을 연결하지 못했습니다. 잠시 후 다시 검색하거나 등록 숙소를 선택해주세요.';return}
    const token=searchToken;
    byId('nearbyStaySearch').disabled=true;byId('nearbyStaySearch').textContent='검색 중';
    byId('nearbyStayStatus').textContent='숙소 위치를 찾고 있습니다…';
    const finish=(results,status)=>{
      if(token!==searchToken||!byId('nearbyStayDialog').open)return;
      cancelSearch();
      if(status!=='OK'){
        byId('nearbyStayStatus').textContent=status==='ZERO_RESULTS'?'검색 결과가 없습니다. 도시·도로명·번지를 함께 입력해주세요.':'검색을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.';
        return;
      }
      const candidates=(results||[]).map(p=>({rememberName:query,expiresAt:Date.now()+30*24*60*60*1000,attributions:p.html_attributions||[],name:p.name||query,address:p.formatted_address,lat:p.geometry?.location?.lat(),lng:p.geometry?.location?.lng()})).filter(cleanPlace);
      renderChoices(candidates,'Google Maps');byId('nearbyGoogleCredit').hidden=false;
      byId('nearbyStayStatus').textContent=candidates.length?'동일한 이름의 숙소가 있을 수 있습니다. 주소를 확인하고 선택해주세요.':'위치를 확인하지 못했습니다. 정확한 주소로 다시 검색해주세요.';
    };
    searchTimer=setTimeout(()=>finish(null,'TIMEOUT'),12000);
    // Search only on submit; explicitly limit fields instead of paid nearby searches.
    const request={query:`${query}, Vietnam`,fields:['name','formatted_address','geometry']};
    const bias=state.nearby||CITY_DATA[state.city]?.center;if(bias)request.locationBias={lat:bias.lat,lng:bias.lng};
    try{new google.maps.places.PlacesService(state.map).findPlaceFromQuery(request,finish)}catch{finish(null,'ERROR')}
  }
  function search(query){
    cancelPendingMapWork();state.query=String(query||'').trim();state.selected=null;clearSearchMarker();closeSystemInfo();
    renderAll();renderHierarchyNav();fit();
  }
  function renderNavigation(){
    if(!active())return false;
    syncMapFilterSummary();
    renderMapFilterRow('#quickAreas','분류',[['all','전체'],...Object.entries(CONFIG.categories).map(([k,v])=>[k,v.label])].map(([key,label])=>`<button type="button" class="navCat ${state.cat===key?'active':''}" aria-pressed="${state.cat===key}" data-nearby-category="${key}">${esc(label)}</button>`).join(''));
    byId('subNav').classList.toggle('show',state.cat!=='all');
    byId('tagNav').classList.remove('show');byId('tagNav').replaceChildren();
    if(state.cat==='all')byId('subNav').replaceChildren();
    else renderMapFilterRow('#subNav',`${catLabel(state.cat)} ›`,[['all','전체'],...(CONFIG.categories[state.cat]?.subs||[]).map(s=>[s,s])].map(([key,label])=>`<button type="button" class="navSub ${state.sub===key?'active':''}" aria-pressed="${state.sub===key}" data-nearby-sub="${esc(key)}">${esc(label)}</button>`).join(''));
    if(state.cat==='restaurant'){
      byId('tagNav').classList.add('show');
      renderMapFilterRow('#tagNav','특징 ›',[['all','전체'],...RESTAURANT_TAGS.map(tag=>[tag,tag])].map(([key,label])=>`<button type="button" class="navSub ${state.restaurantTag===key?'active':''}" aria-pressed="${state.restaurantTag===key}" data-nearby-tag="${esc(key)}">${esc(label)}</button>`).join(''));
      document.querySelectorAll('[data-nearby-tag]').forEach(button=>button.addEventListener('click',()=>{
        state.restaurantTag=button.dataset.nearbyTag;state.selected=null;renderAll();renderNavigation();fit();
      }));
    }
    document.querySelectorAll('[data-nearby-category]').forEach(button=>button.addEventListener('click',()=>{
      state.cat=button.dataset.nearbyCategory;state.sub='all';state.restaurantTag='all';state.navCategory=null;state.selectedNavItem=null;state.selected=null;
      renderAll();renderNavigation();fit();
    }));
    document.querySelectorAll('[data-nearby-sub]').forEach(button=>button.addEventListener('click',()=>{
      state.sub=button.dataset.nearbySub;state.selected=null;renderAll();renderNavigation();fit();
    }));
    return true;
  }
  window.NearbyBusinesses={active,apply,clear,setRadius,fit,sync,current,search,renderNavigation,distanceLabel};
  byId('nearbyCurrent').addEventListener('click',current);
  byId('locBtn').onclick=current;
  byId('nearbyStay').addEventListener('click',openStay);
  byId('nearbyClear').addEventListener('click',()=>clear());
  byId('nearbyOrigin').addEventListener('click',fit);
  byId('nearbyRadius').addEventListener('change',e=>setRadius(e.target.value));
  byId('nearbyStayClose').addEventListener('click',()=>byId('nearbyStayDialog').close());
  byId('nearbyStayDialog').addEventListener('close',cancelSearch);
  byId('nearbyStayDialog').addEventListener('click',e=>{if(e.target===byId('nearbyStayDialog'))e.target.close()});
  byId('nearbyStayForm').addEventListener('submit',searchStay);
  byId('nearbyStayQuery').addEventListener('input',showLocalStays);
  byId('nearbyUseSaved').addEventListener('click',()=>{if(savedStay)chooseStay(savedStay)});
  byId('nearbyForgetStay').addEventListener('click',()=>{
    savedStay=null;let removed=true;try{localStorage.removeItem(storageKey)}catch{removed=false}
    byId('nearbySavedStay').hidden=true;
    byId('nearbyStayStatus').textContent=removed?'기억한 숙소를 삭제했습니다.':'이번 화면에서는 지웠습니다. 저장된 숙소는 브라우저 사이트 데이터에서 삭제해주세요.';
  });
  sync();
})();
