// Personal choices stay in this browser and never change the shared business database.
(()=>{
  const key='viettrip_personal_places_v1';
  let storageFailed=false,view='all';
  const clean=values=>new Set(Array.isArray(values)?values.filter(v=>typeof v==='string'&&v.length>0&&v.length<=160).slice(0,5000):[]);
  function read(){
    try{const data=JSON.parse(window.localStorage.getItem(key)||'{}');return {favorites:clean(data?.favorites),hidden:clean(data?.hidden)}}
    catch{storageFailed=true;return null}
  }
  let data=read()||{favorites:new Set(),hidden:new Set()};
  function toggle(field,id){
    if(typeof id!=='string'||!id||id.length>160)return {changed:false,saved:false};
    if(!storageFailed)data=read()||data;
    const selected=data[field];selected.has(id)?selected.delete(id):selected.add(id);
    let saved=true;
    try{window.localStorage.setItem(key,JSON.stringify({favorites:[...data.favorites],hidden:[...data.hidden]}));storageFailed=false}
    catch{storageFailed=true;saved=false}
    return {changed:true,saved,active:selected.has(id)};
  }
  window.PersonalPlaces={
    isFavorite:id=>data.favorites.has(id),isHidden:id=>data.hidden.has(id),
    toggleFavorite:id=>toggle('favorites',id),toggleHidden:id=>toggle('hidden',id),
    getView:()=>view,
    setView:value=>{if(['all','favorites','hidden'].includes(value))view=value},
    filter:(places,forList=false)=>places.filter(p=>view==='hidden'
      ? forList&&data.hidden.has(p.id)
      : !data.hidden.has(p.id)&&(view!=='favorites'||data.favorites.has(p.id)))
  };
  function announce(message){
    const status=document.getElementById('personalPlaceStatus');
    if(status){status.textContent=message;status.hidden=false;clearTimeout(announce.timer);announce.timer=setTimeout(()=>{status.hidden=true},4500)}
  }
  function refresh(focusId,action){
    const list=document.getElementById('list'),scrollTop=list?.scrollTop||0;
    closeSystemInfo();
    if(data.hidden.has(state.selected))state.selected=null;
    renderList();renderMarkers();refreshRegisteredCoverage();renderDetail();
    if(list){
      list.scrollTop=scrollTop;
      if(focusId){
        const button=[...list.querySelectorAll('[data-personal-action]')].find(b=>b.dataset.placeId===focusId&&b.dataset.personalAction===action);
        const fallback=document.querySelector('[data-personal-view][aria-pressed="true"]');
        (button||fallback)?.focus({preventScroll:true});
      }
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-personal-view]').forEach(button=>button.addEventListener('click',()=>{
      window.PersonalPlaces.setView(button.dataset.personalView);refresh();
    }));
    document.getElementById('list')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-personal-action]');if(!button)return;
      event.stopPropagation();
      const id=button.dataset.placeId,action=button.dataset.personalAction;
      const result=action==='favorite'?window.PersonalPlaces.toggleFavorite(id):window.PersonalPlaces.toggleHidden(id);
      if(!result.changed)return;
      refresh(id,action);
      announce(!result.saved?'이 브라우저에서 저장할 수 없어 이번 화면에서만 적용됩니다.':action==='favorite'
        ?(result.active?'이 브라우저의 즐겨찾기에 저장했습니다.':'즐겨찾기에서 해제했습니다.')
        :(result.active?'회원 등록 표시를 숨겼습니다. ‘숨긴 업체’에서 되돌릴 수 있습니다.':'숨기기를 해제했습니다. 전체 목록에서 다시 볼 수 있습니다.'));
    });
  });
  window.addEventListener?.('storage',event=>{
    if(event.key!==key&&event.key!==null)return;
    data=read()||data;
    if(document.getElementById('list'))refresh();
  });
})();
