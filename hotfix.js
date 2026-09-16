// Hotfix 2026-09-17: always show shared businesses even if reviews/cache fail.
(async()=>{
  try{
    const robustFetchSharedDb=async()=>{
      let places=[];
      let reviews=[];
      let placeErr=null;
      try{
        places=await supaGet('places_public','select=*&order=created_at.asc');
      }catch(err){
        console.warn('places_public failed; trying places fallback',err);
        try{
          places=await supaGet('places','select=id,name,category,subcategory,area,address,lat,lng,description,initial_rating,member_benefit,benefit_text,photo_urls,tags,created_at,updated_at&order=created_at.asc');
        }catch(err2){placeErr=err2;}
      }
      if(placeErr)throw placeErr;
      try{
        reviews=await supaGet('reviews','select=*&order=created_at.asc');
      }catch(err){
        console.warn('reviews failed; businesses still shown',err);
        reviews=[];
      }
      return dedupeDbData({
        places:(places||[]).map(remotePlaceToLocal),
        reviews:(reviews||[]).map(remoteReviewToLocal)
      });
    };

    // Override future refreshes too.
    fetchSharedDb=robustFetchSharedDb;

    const shared=await robustFetchSharedDb();
    saveDb(shared);
    state.sharedDbLoading=false;
    renderAll();
    renderHierarchyNav();
    if(typeof syncMobileListCount==='function')syncMobileListCount();
    setDbStatus(`공용 DB · 업체 ${shared.places.length}개 표시 · 후기 ${shared.reviews.length}개`,true);

    // Ensure markers are refreshed if Google Maps initialized slightly later.
    setTimeout(()=>{
      try{renderAll(); if(state.map)google.maps.event.trigger(state.map,'resize');}catch(e){}
    },700);
  }catch(err){
    console.error('shared business hotfix failed',err);
    try{setDbStatus('공용 업체 불러오기 실패 · 새로고침해주세요.');}catch(e){}
  }
})();
