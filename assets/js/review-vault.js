/* Local, versioned safety copies. Never publish a cached record automatically. */
(() => {
  'use strict';
  const key='viettrip_my_review_versions_v1',draftKey='viettrip_review_drafts_v1';
  const read=k=>{try{const x=JSON.parse(safeStorageGet(k)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
  const write=(k,rows)=>safeStorageSet(k,JSON.stringify(rows));
  function archive(reviews=[]){
    const rows=read(key);
    for(const r of reviews||[]){
      if(!r?.text?.trim()||!isOwnReview(r))continue;
      if(rows.some(x=>x.id===r.id&&x.text===r.text&&x.cafeUrl===(r.cafeUrl||'')))continue;
      rows.unshift({id:r.id,placeId:r.placeId,text:r.text,nickname:r.nickname,rating:r.rating,cafeUrl:r.cafeUrl||'',photoUrls:(r.photoUrls||[]).slice(0,3),createdBy:r.createdBy,createdByHash:r.createdByHash,savedAt:new Date().toISOString()});
    }
    write(key,rows.slice(0,150));
  }
  function capture(){
    const placeId=state.reviewEditPlaceId;if(!placeId||!document.getElementById('reviewModal')?.classList.contains('open'))return;
    const text=document.getElementById('rText').value.trim();if(!text)return;
    const rows=read(draftKey).filter(r=>r.placeId!==placeId);
    rows.unshift({placeId,text,nickname:document.getElementById('rName').value.trim(),rating:state.rating,cafeUrl:document.getElementById('rCafeUrl').value.trim(),savedAt:new Date().toISOString()});write(draftKey,rows.slice(0,40));
  }
  function offer(placeId,mine){
    document.getElementById('reviewRecovery')?.remove();
    if(!placeId)return;
    // Keep an older browser cache before the next shared sync replaces it.
    for(const k of [DBKEY,DBKEY+'_backup']){try{archive(JSON.parse(safeStorageGet(k)||'{}').reviews||[])}catch{}}
    const draft=read(draftKey).find(r=>r.placeId===placeId&&r.text!==mine?.text);
    const previous=read(key).find(r=>r.placeId===placeId&&r.text!==mine?.text&&isOwnReview(r));
    const candidate=draft||previous;if(!candidate)return;
    const box=document.createElement('div');box.className='reviewRecovery';box.id='reviewRecovery';
    const note=document.createElement('div');note.textContent=draft?'이 기기에 작성 중이던 후기가 남아 있습니다.':'이 기기에 보관된 이전 후기가 있습니다.';
    const button=document.createElement('button');button.type='button';button.textContent='보관한 내용 불러오기';
    button.onclick=()=>{
      if(state.reviewEditPlaceId!==placeId)return;
      if(document.getElementById('rText').value.trim()&&!confirm('현재 입력창을 보관된 내용으로 바꿀까요? 저장 전에는 공개 후기가 바뀌지 않습니다.'))return;
      document.getElementById('rText').value=candidate.text;document.getElementById('rName').value=candidate.nickname||rememberedMemberNickname();document.getElementById('rCafeUrl').value=candidate.cafeUrl||'';
      state.rating=candidate.rating??state.rating;renderStars();
      if(candidate.photoUrls){state.reviewExistingPhotos=[...candidate.photoUrls];renderReviewPhotoPreview();}
      note.textContent='보관한 내용을 불러왔습니다. 확인 후 저장하면 복구됩니다.';button.disabled=true;
    };
    box.append(note,button);document.getElementById('rText').parentElement.before(box);
  }
  let timer;
  document.addEventListener('input',event=>{if(event.target.closest('#reviewModal')){clearTimeout(timer);timer=setTimeout(capture,250);}});
  document.addEventListener('click',event=>{if(event.target.closest('#reviewEditorClose,[data-close="reviewModal"]'))capture();},true);
  window.addEventListener('pagehide',capture);
  window.ReviewVault={archive,capture,offer,saved:placeId=>write(draftKey,read(draftKey).filter(r=>r.placeId!==placeId))};
  // Identity is initialized asynchronously. Recheck once its hash is ready.
  document.addEventListener('map-data-saved',()=>archive(db().reviews));
  initDeviceHash().then(()=>{archive(db().reviews);try{archive(JSON.parse(safeStorageGet(DBKEY+'_backup')||'{}').reviews||[])}catch{}}).catch(()=>{});
})();
