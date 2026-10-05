(() => {
  let height=null,bottom=null,frame=null,animation=null,pending=null,dragging=false,tracking=false,dragBounds=null,pendingRefresh=false;
  const panel=()=>document.getElementById('detail');
  const mobile=()=>typeof isMobileMapLayout==='function'?isMobileMapLayout():window.matchMedia('(max-width:900px)').matches;
  function topGap(){
    if(!mobile())return 14;
    const header=document.querySelector('.top')?.getBoundingClientRect();
    return Math.max(14,Math.min((header?.bottom??6)+8,window.innerHeight-220));
  }
  function syncTopGap(){panel()?.style.setProperty('--detail-top-gap',topGap()+'px')}
  function bounds(){
    if(dragBounds)return dragBounds;
    const map=document.querySelector('.mapwrap').getBoundingClientRect(),rect=panel().getBoundingClientRect();
    // Keep the phone search header visible at every sheet height.
    const area=mobile()?{height:window.innerHeight,bottom:window.innerHeight}:map;
    const gap=bottom??Math.max(12,area.bottom-rect.bottom),max=Math.max(80,area.height-gap-topGap());
    // Title and actions now share the panel's native scroll container.
    // Long names must not force the entire sheet to stay tall.
    return {min:Math.min(180,max),max,gap};
  }
  const clamp=(value,b=bounds())=>Math.max(b.min,Math.min(b.max,value));
  function refresh(){if(pendingRefresh){pendingRefresh=false;renderDetail()}}
  function aria(){
    const handle=panel()?.querySelector('.detailResizeHandle');if(!handle)return;
    const b=bounds();
    handle.setAttribute('aria-valuemin',Math.round(b.min));handle.setAttribute('aria-valuemax',Math.round(b.max));
    handle.setAttribute('aria-valuenow',Math.round(height??panel().getBoundingClientRect().height));
    handle.setAttribute('aria-valuetext',height===null?'기본 높이':Math.round(height)+'픽셀');
  }
  function apply(value){
    const p=panel(),b=bounds();height=clamp(value,b);bottom=b.gap;
    p.style.setProperty('--sheet-height',Math.round(height*100)/100+'px');
    p.style.setProperty('--sheet-bottom',bottom+'px');p.classList.add('detailResized');
    const expanded=height>(p.classList.contains('externalDetail')?b.min+32:Math.min(240,b.min+60));
    // No media reload, markup replacement or repeated layout sync on drag frames.
    if(detailExpanded!==expanded){detailExpanded=expanded;syncDetailPanelLayout()}
    aria();
  }
  function flush(){
    if(frame!==null)cancelAnimationFrame(frame);frame=null;
    if(pending!==null){const next=pending;pending=null;apply(next)}
  }
  function queue(value){
    pending=value;
    if(frame===null)frame=requestAnimationFrame(()=>{frame=null;flush()});
  }
  function stopAnimation(){
    if(animation!==null)cancelAnimationFrame(animation);animation=null;
    if(!dragging)dragBounds=null;
    panel()?.classList.remove('detailSettling');
  }
  function settle({canceled=false,velocity=0}={}){
    flush();dragging=false;dragBounds=null;
    const p=panel();p?.classList.remove('detailDragging');
    if(canceled || !p?.classList.contains('show') || height===null)return;
    // A sheet stops under the finger. Only reading scroll has momentum.
    apply(height);refresh();positionSelectedPlaceInView();
  }

  function reset(){
    pendingRefresh=false;
    window.BodySheetDrag?.cancel(panel()?.parentElement?.id==='businessSide'?panel().parentElement:panel());stopAnimation();
    if(frame!==null)cancelAnimationFrame(frame);frame=null;pending=null;
    height=null;bottom=null;dragging=false;tracking=false;dragBounds=null;
    const p=panel();if(!p)return;
    p.classList.remove('detailResized','detailDragging');
    p.style.removeProperty('--sheet-height');p.style.removeProperty('--sheet-bottom');
  }
  function sync(){
    if(panel()?.parentElement?.id==='businessSide'){
      const p=panel();if(!p.classList.contains('show'))return;
      if(!p.querySelector('.detailScroll')){
        const content=document.createElement('div');content.className='detailScroll';
        const header=p.querySelector('.detailHeader');
        for(const child of [...p.children])if(child!==header&&!child.classList.contains('detailResizeHandle'))content.append(child);
        p.append(content);p.scrollTop=0;
      }
      return;
    }
    const p=panel();if(!p?.classList.contains('show'))return;
    syncTopGap();
    window.BodySheetDrag?.bind(p,{
      anywhere:true,separateResizeAndScroll:true,
      includeHeaders:true,headerSelector:'.detailResizeHandle,.detailHeader',bounds,
      prepare(){stopAnimation();flush();tracking=true},
      start(){bottom=null;dragBounds=bounds();dragging=true;p.classList.add('detailDragging')},
      size:queue,flush,end:settle,
      afterEnd(){tracking=false;if(animation===null)refresh()}
    });
    let handle=p.querySelector('.detailResizeHandle');
    if(!handle){
      handle=document.createElement('div');handle.className='detailResizeHandle';handle.tabIndex=0;
      handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','horizontal');
      handle.setAttribute('aria-label','상세창 높이 조절');handle.setAttribute('aria-controls','detailBody');
      handle.title='창 어디서나 위아래로 높이 조절 · 최대로 펼치면 내용 스크롤 · 방향키도 사용 가능';
      handle.innerHTML='<span aria-hidden="true"></span>';p.prepend(handle);
      handle.addEventListener('keydown',event=>{
        const b=bounds(),current=height??p.getBoundingClientRect().height;
        const next={ArrowUp:current+40,ArrowDown:current-40,Home:b.min,End:b.max}[event.key];
        if(next==null)return;event.preventDefault();stopAnimation();apply(next);positionSelectedPlaceInView();
      });
    }
    aria();
  }
  function toggle(){
    if(panel()?.parentElement?.id==='businessSide'){window.MenuSheetResize?.toggle(panel().parentElement);return;}
    const p=panel();if(!p?.classList.contains('show'))return;
    window.BodySheetDrag?.cancel(p);stopAnimation();flush();dragBounds=null;
    const b=bounds();apply(p.getBoundingClientRect().height>=b.max-3?b.min:b.max);p.scrollTop=0;positionSelectedPlaceInView();
  }
  window.DetailSheetResize={sync,reset,toggle,isInteracting:()=>tracking||dragging||animation!==null||Boolean(window.MenuSheetResize?.isInteracting(panel()?.parentElement)),deferRefresh:()=>{pendingRefresh=true},flushRefresh:refresh};
  window.addEventListener('resize',()=>{stopAnimation();dragBounds=null;syncTopGap();if(height!==null&&panel()?.classList.contains('show')){bottom=null;apply(height)}});
  window.addEventListener('blur',stopAnimation);
  window.addEventListener('pagehide',stopAnimation);
})();
