// Runtime guard: shared businesses must remain visible even when a secondary API/cache/filter fails.
(function(){
  let running=false;

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

      // If the city matcher regresses, keep HCMC records visible rather than showing 0.
      if(typeof placesForCurrentCity==='function' && typeof state!=='undefined' && state.city==='hcmc'){
        const original=placesForCurrentCity;
        const probe=original();
        if(!probe.length && merged.places.some(hcmcPlace)){
          window.__viettripOriginalPlacesForCurrentCity=original;
          placesForCurrentCity=function(){
            if(state.city==='hcmc')return (db().places||[]).filter(hcmcPlace);
            return window.__viettripOriginalPlacesForCurrentCity();
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
      if(typeof setDbStatus==='function')setDbStatus(`공용 DB · 업체 ${places.length}개 표시`,true);
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