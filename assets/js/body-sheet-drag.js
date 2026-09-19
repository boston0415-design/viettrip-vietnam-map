// Body gestures resize at the top of the content; native scrolling wins elsewhere.
// Touch Events let us make that choice before preventing a native vertical scroll.
(() => {
  const bindings=new WeakMap();
  const headers='.detailResizeHandle,.detailHeader,.menuResizeGrip,.menuResizeHeader';
  const controls='input,select,textarea,label,[contenteditable]:not([contenteditable="false"]),video,audio,iframe,[role="slider"],[data-no-sheet-drag]';
  function bind(panel,options){
    if(bindings.has(panel))return;
    let gesture=null,suppressUntil=0;
    function end(){
      if(!gesture)return;
      const old=gesture;gesture=null;
      try{if(old.kind==='pointer' && panel.hasPointerCapture(old.id))panel.releasePointerCapture(old.id)}catch{}
      if(old.resizing){
        suppressUntil=Date.now()+500;
        options.end?.();
      }
    }
    function atTop(target){
      for(let node=target;node;node=node.parentElement){
        if(node.scrollTop>1)return false;
        if(node===panel)break;
      }
      return true;
    }
    function begin(event,point,kind){
      if(gesture || !point || event.defaultPrevented)return;
      const target=event.target.closest?.('*');
      if(!target || target.closest(headers) || target.closest(controls))return;
      // Do not intercept the native desktop scrollbar thumb.
      const rect=target.getBoundingClientRect();
      if(kind==='pointer' && target.clientWidth>0 && target.offsetWidth>target.clientWidth+2 && point.clientX>=rect.left+target.clientLeft+target.clientWidth)return;
      gesture={kind,id:kind==='touch'?point.identifier:event.pointerId,x:point.clientX,y:point.clientY,h:panel.getBoundingClientRect().height,top:atTop(target),resizing:false,scrolling:false};
    }
    function move(event,point){
      const g=gesture;if(!g || !point || g.scrolling)return;
      const dy=g.y-point.clientY,dx=point.clientX-g.x;
      if(!g.resizing){
        if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
        const bounds=options.bounds();
        // Lock one gesture to scrolling or resizing. No sudden takeover midway.
        if(Math.abs(dx)>=Math.abs(dy) || !g.top || (dy>0 && g.h>=bounds.max-2) || (dy<0 && g.h<=bounds.min+2) || !event.cancelable){g.scrolling=true;return}
        g.resizing=true;
        options.start?.();
        if(g.kind==='pointer')try{panel.setPointerCapture(g.id)}catch{}
      }
      event.preventDefault();
      suppressUntil=Date.now()+500;
      options.size(g.h+dy);
    }
    panel.addEventListener('click',event=>{
      if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation()}
    },true);
    panel.addEventListener('dragstart',event=>{if(gesture && !gesture.scrolling)event.preventDefault()});
    panel.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch' || !event.isPrimary || event.button!==0)return;
      begin(event,event,'pointer');
    });
    panel.addEventListener('pointermove',event=>{if(gesture?.kind==='pointer' && gesture.id===event.pointerId)move(event,event)});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,event=>{if(gesture?.kind==='pointer' && gesture.id===event.pointerId)end()});
    panel.addEventListener('touchstart',event=>{
      if(event.touches.length!==1){end();return}
      begin(event,event.touches[0],'touch');
    },{passive:true});
    panel.addEventListener('touchmove',event=>{
      if(gesture?.kind!=='touch')return;
      if(event.touches.length!==1){end();return}
      move(event,Array.from(event.touches).find(point=>point.identifier===gesture.id));
    },{passive:false});
    for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
      if(gesture?.kind==='touch' && Array.from(event.changedTouches).some(point=>point.identifier===gesture.id))end();
    },{passive:true});
    window.addEventListener('blur',end);
    window.addEventListener('pagehide',end);
    window.addEventListener('resize',end);
    bindings.set(panel,{end});
  }
  window.BodySheetDrag={bind,cancel:panel=>bindings.get(panel)?.end()};
})();
