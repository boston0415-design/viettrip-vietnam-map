(() => {
  let height=null, bottom=null, drag=null;
  const panel=()=>document.getElementById('detail');
  function bounds(){
    const map=document.querySelector('.mapwrap').getBoundingClientRect();
    const rect=panel().getBoundingClientRect();
    const gap=bottom??Math.max(12,map.bottom-rect.bottom);
    const max=Math.max(80,map.height-gap-12);
    return {min:Math.min(180,max),max,gap};
  }
  function apply(value){
    const p=panel(),b=bounds();
    height=Math.round(Math.max(b.min,Math.min(b.max,value)));
    bottom=b.gap;
    p.style.setProperty('--sheet-height',height+'px');
    p.style.setProperty('--sheet-bottom',bottom+'px');
    p.classList.add('detailResized');
    detailExpanded=height>Math.min(240,b.min+60);
    syncDetailPanelLayout();
  }
  function finish(event){
    if(!drag||event&&event.pointerId!==drag.id)return;
    const old=drag;drag=null;
    try{if(old.handle.hasPointerCapture(old.id))old.handle.releasePointerCapture(old.id)}catch{}
    panel()?.classList.remove('detailDragging');
    if(old.moved)positionSelectedPlaceInView();
  }
  function reset(){
    finish();height=null;bottom=null;
    const p=panel();if(!p)return;
    p.classList.remove('detailResized');
    p.style.removeProperty('--sheet-height');p.style.removeProperty('--sheet-bottom');
  }
  function sync(){
    const p=panel();if(!p?.classList.contains('show'))return;
    let handle=p.querySelector('.detailResizeHandle');
    if(!handle){
      if(drag)finish();
      handle=document.createElement('div');
      handle.className='detailResizeHandle';handle.tabIndex=0;
      handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','horizontal');
      handle.setAttribute('aria-label','상세창 높이 조절');handle.setAttribute('aria-controls','detailBody');
      handle.title='위아래로 끌어서 크기 조절 · 방향키로도 조절';
      handle.innerHTML='<span aria-hidden="true"></span>';
      p.prepend(handle);
      handle.addEventListener('pointerdown',e=>{
        if(!e.isPrimary||e.button!==0)return;
        const rect=p.getBoundingClientRect();
        bottom=null;
        drag={id:e.pointerId,y:e.clientY,height:rect.height,handle,moved:false};
        handle.setPointerCapture(e.pointerId);e.preventDefault();
      });
      handle.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const delta=drag.y-e.clientY;
        if(!drag.moved&&Math.abs(delta)<4)return;
        drag.moved=true;p.classList.add('detailDragging');
        apply(drag.height+delta);e.preventDefault();
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>handle.addEventListener(type,finish));
      handle.addEventListener('keydown',e=>{
        const b=bounds(),current=height??p.getBoundingClientRect().height;
        const next={ArrowUp:current+40,ArrowDown:current-40,Home:b.min,End:b.max}[e.key];
        if(next==null)return;
        e.preventDefault();apply(next);positionSelectedPlaceInView();
      });
    }
    const b=bounds();
    handle.setAttribute('aria-valuemin',Math.round(b.min));
    handle.setAttribute('aria-valuemax',Math.round(b.max));
    handle.setAttribute('aria-valuenow',Math.round(height??p.getBoundingClientRect().height));
    handle.setAttribute('aria-valuetext',height?height+'픽셀':'기본 높이');
  }
  window.DetailSheetResize={sync,reset};
  window.addEventListener('resize',()=>{if(height!==null&&panel()?.classList.contains('show')){bottom=null;apply(height)}});
  window.addEventListener('blur',()=>finish());
})();
