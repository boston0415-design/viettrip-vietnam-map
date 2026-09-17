// Runtime guard: shared businesses must remain visible even when a secondary API/cache/filter fails.
(function(){
  let running=false;

  // Registered-place city classification must never mean "nearest supported city anywhere in Vietnam".
  // A place is assigned only when it is inside that city's supported operating radius, or its
  // address/area explicitly names the city. Overlapping ranges are resolved by nearest center.
  const CITY_CLASSIFICATION_RADIUS_KM={
    hcmc:70,
    hanoi:70,
    danang:38,
    nhatrang:35,
    phuquoc:45,
    dalat:40,
    hoian:22,
    vungtau:55,
    muine:40
  };

  function finiteLatLng(place){
    const lat=Number(place?.lat), lng=Number(place?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  }

  function cityRadiusMeters(key){
    return Math.max(1,Number(CITY_CLASSIFICATION_RADIUS_KM[key]||35))*1000;
  }

  function scopedNearestCityKey(lat,lng){
    const point={lat:Number(lat),lng:Number(lng)};
    if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng))return null;

    let bestKey=null;
    let bestDistance=Infinity;
    Object.entries(CITY_DATA||{}).forEach(([key,city])=>{
      if(!city?.center)return;
      const distance=geoDistanceMeters(point,city.center);
      if(distance<=cityRadiusMeters(key) && distance<bestDistance){
        bestDistance=distance;
        bestKey=key;
      }
    });
    return bestKey;
  }

  function scopedPlaceCityKey(place){
    if(!place)return null;
    const explicit=typeof explicitPlaceCityKey==='function'?explicitPlaceCityKey(place):null;
    const pos=finiteLatLng(place);

    if(explicit){
      if(!pos)return explicit;
      const city=CITY_DATA?.[explicit];
      if(!city?.center)return explicit;
      const distance=geoDistanceMeters(pos,city.center);
      // Explicit address/area is authoritative unless coordinates are obviously from another region.
      if(distance<=cityRadiusMeters(explicit)*1.8)return explicit;
    }

    if(pos)return scopedNearestCityKey(pos.lat,pos.lng);
    return explicit||null;
  }

  // Replace the old unlimited nearest-city matcher globally.
  if(typeof nearestCityKeyForLatLng==='function'){
    nearestCityKeyForLatLng=scopedNearestCityKey;
  }
  if(typeof placeCityKey==='function'){
    placeCityKey=scopedPlaceCityKey;
  }
  if(typeof placeInCity==='function'){
    placeInCity=function(place,cityKey=state.city){
      return !!place && scopedPlaceCityKey(place)===cityKey;
    };
  }
  if(typeof placesForCurrentCity==='function'){
    placesForCurrentCity=function(){
      return (db().places||[]).filter(p=>scopedPlaceCityKey(p)===state.city);
    };
  }

  function categoryScopeAudit(){
    const navLabels=new Set((NAV_CATEGORIES||[]).map(x=>x.label));
    const configLabels=new Set(Object.values(CONFIG?.categories||{}).map(x=>x.label));
    const missingInNav=[...configLabels].filter(x=>!navLabels.has(x));
    const unknownNav=[...navLabels].filter(x=>!configLabels.has(x) && !['거리','공항','전철','기차역','한인생활권','병원'].includes(x));
    return {missingInNav,unknownNav};
  }

  function cityScopeAudit(){
    const out={assigned:{},unassigned:0,total:0,scopeKm:{...CITY_CLASSIFICATION_RADIUS_KM}};
    Object.keys(CITY_DATA||{}).forEach(k=>out.assigned[k]=0);
    (db().places||[]).forEach(p=>{
      out.total++;
      const k=scopedPlaceCityKey(p);
      if(k && Object.prototype.hasOwnProperty.call(out.assigned,k))out.assigned[k]++;
      else out.unassigned++;
    });
    return out;
  }

  window.auditClassificationScopes=function(){
    return {cities:cityScopeAudit(),categories:categoryScopeAudit()};
  };

  function hcmcPlace(p){
    const a=`${p?.area||''} ${p?.address||''}`.toLowerCase();
    const lat=Number(p?.lat), lng=Number(p?.lng);
    return /호치민|hồ chí minh|ho chi minh|saigon|sài gòn/.test(a) ||
      (Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=10.55&&lat<=11.05&&lng>=106.45&&lng<=107.05);
  }

  async function loadPlacesOnly(){
    let rows=null;
    try{
      rows=await supaGet('places_public','select=*&order=created_at.asc');
    }catch(err){
      console.warn('runtime guard: places_public failed',err);
      rows=await supaGet('places','select=id,name,category,subcategory,area,address,lat,lng,description,initial_rating,member_benefit,benefit_text,photo_urls,tags,created_at,updated_at&order=created_at.asc');
    }
    return (rows||[]).map(remotePlaceToLocal);
  }

  async function ensureSharedBusinesses(){
    if(running)return;
    running=true;
    try{
      const places=await loadPlacesOnly();
      if(!places.length)return;

      let reviews=[];
      try{
        reviews=await supaGet('reviews','select=*&order=created_at.asc');
        reviews=(reviews||[]).map(remoteReviewToLocal);
      }catch(err){
        console.warn('runtime guard: reviews failed; keep businesses visible',err);
      }

      const current=typeof db==='function'?db():{places:[],reviews:[]};
      const merged=dedupeDbData({
        places:[...places,...(current.places||[])],
        reviews:reviews.length?reviews:(current.reviews||[])
      });
      saveDb(merged);
      if(typeof state!=='undefined')state.sharedDbLoading=false;

      // Emergency fallback only: if HCMC still becomes empty despite having clearly HCMC records,
      // keep those records visible. Normal operation uses the scoped matcher above.
      if(typeof placesForCurrentCity==='function' && typeof state!=='undefined' && state.city==='hcmc'){
        const probe=placesForCurrentCity();
        if(!probe.length && merged.places.some(hcmcPlace)){
          const scoped=placesForCurrentCity;
          window.__viettripScopedPlacesForCurrentCity=scoped;
          placesForCurrentCity=function(){
            if(state.city==='hcmc')return (db().places||[]).filter(hcmcPlace);
            return window.__viettripScopedPlacesForCurrentCity();
          };
        }
      }

      if(typeof renderCats==='function')renderCats();
      if(typeof renderAll==='function')renderAll();
      else{
        if(typeof renderList==='function')renderList();
        if(typeof renderMarkers==='function')renderMarkers();
      }
      if(typeof renderHierarchyNav==='function')renderHierarchyNav();
      if(typeof syncMobileListCount==='function')syncMobileListCount();

      const audit=cityScopeAudit();
      const shown=placesForCurrentCity().length;
      const suffix=audit.unassigned?` · 미분류 ${audit.unassigned}개`:'';
      if(typeof setDbStatus==='function')setDbStatus(`공용 DB · 현재 지역 업체 ${shown}개${suffix}`,true);
    }catch(err){
      console.error('runtime guard failed',err);
    }finally{
      running=false;
    }
  }

  window.ensureSharedBusinesses=ensureSharedBusinesses;
  setTimeout(ensureSharedBusinesses,50);
  setTimeout(ensureSharedBusinesses,900);
  setTimeout(ensureSharedBusinesses,2500);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')ensureSharedBusinesses();
  });
})();