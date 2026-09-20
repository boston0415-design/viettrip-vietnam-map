document.addEventListener('DOMContentLoaded',()=>{
  const filterToggle=document.getElementById('mobileFilterToggle');
  filterToggle?.addEventListener('click',()=>{
    const open=document.getElementById('businessSide').classList.toggle('mobileFiltersOpen');
    filterToggle.setAttribute('aria-expanded',String(open));
    filterToggle.textContent=open?'옵션 닫기':'옵션';
  });
  document.getElementById('listSharedFilters')?.addEventListener('click',()=>{
    closeMobileBusinessList();setMobileLegendExpanded(true);
    document.getElementById('areaLegendTitle')?.focus({preventScroll:true});
  });
  const button=document.getElementById('desktopListToggle');
  const content=document.querySelector('.content');
  if(!button||!content)return;
  document.getElementById('mobileListClose')?.addEventListener('click',()=>{
    if(window.matchMedia('(min-width:901px)').matches&&!content.classList.contains('desktopListCollapsed'))button.click();
  });
  button.addEventListener('click',()=>{
    if(!window.matchMedia('(min-width:901px)').matches)return;
    const collapsed=content.classList.toggle('desktopListCollapsed');
    button.textContent=collapsed?'›':'‹';
    button.setAttribute('aria-expanded',String(!collapsed));
    const label=collapsed?'업체 목록 펼치기':'업체 목록 접기';
    button.setAttribute('aria-label',label);button.title=label;
    // Layout changes only: preserve the city, filters, selection and map center.
    window.MapUX?.syncNearby();
    requestAnimationFrame(()=>{
      if(state.map&&window.google?.maps?.event){
        const center=state.map.getCenter();
        google.maps.event.trigger(state.map,'resize');
        if(center)state.map.setCenter(center);
      }
    });
  });
});
