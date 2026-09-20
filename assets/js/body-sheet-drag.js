// Map sheets expand before scrolling, including name/button/photo drags.
// Other dialogs retain explicit-handle resizing and native form scrolling.
(() => {
  const bindings=new WeakMap();
  const headers='.detailResizeHandle,.detailHeader,.menuResizeGrip,.menuResizeHeader';
  const controls='button,a,img,summary,[role="button"],input,select,textarea,label,[contenteditable]:not([contenteditable="false"]),video,audio,iframe,[role="slider"],[data-no-sheet-drag]';
  function bindAnywhere(panel,options){
    let gesture=null,suppressUntil=0;
    panel.classList.add('sheetDragSurface');
    const editor='input,textarea,select,[contenteditable]:not([contenteditable="false"]),video,audio,iframe,[data-native-input]';
    const scrollNode=()=>options.scrollElement?.()||panel;
    function finish(canceled=false){
      const g=gesture;if(!g)return;gesture=null;
      try{if(g.kind==='pointer'&&panel.hasPointerCapture(g.id))panel.releasePointerCapture(g.id)}catch{}
      if(g.active){
        suppressUntil=Date.now()+400;
        if(g.resized)options.end?.({canceled,kind:g.kind,velocity:g.velocity});
        else options.end?.({canceled:true,kind:g.kind,velocity:0});
      }
      if(g.prepared)options.afterEnd?.();
    }
    function begin(event,point,kind){
      // A fresh deliberate contact must never be blocked by the preceding drag.
      suppressUntil=0;
      const target=event.target.closest?.('*');
      if(gesture||!point||event.defaultPrevented||!target||target.closest(editor))return;
      const rect=panel.getBoundingClientRect();
      if(kind==='pointer'&&panel.offsetWidth>panel.clientWidth+2&&point.clientX>=rect.right-(panel.offsetWidth-panel.clientWidth))return;
      options.prepare?.();
      gesture={kind,id:kind==='touch'?point.identifier:event.pointerId,target,x:point.clientX,y:point.clientY,lastY:point.clientY,lastTime:performance.now(),height:panel.getBoundingClientRect().height,force:!!target.closest(options.headerSelector||'.detailHeader,.mobileSideHead,.nearbyResultsHead'),active:false,resized:false,prepared:true,velocity:0,axis:null};
    }
    function move(event,point){
      const g=gesture;if(!g||!point||g.axis==='x')return;
      const dx=point.clientX-g.x,total=g.y-point.clientY;
      if(!g.active){
        if(Math.max(Math.abs(dx),Math.abs(total))<8)return;
        if(Math.abs(dx)>Math.abs(total)||!event.cancelable){g.axis='x';return;}
        g.active=true;g.axis='y';options.start?.();
        if(g.kind==='pointer')try{panel.setPointerCapture(g.id)}catch{}
      }
      if(event.cancelable)event.preventDefault();
      const b=options.bounds(),scroller=scrollNode(),oldHeight=g.height;
      let delta=g.lastY-point.clientY,pendingScroll=0;
      if(delta>0){
        // Even a previously scrolled compact sheet expands BEFORE its content.
        const growth=Math.min(delta,Math.max(0,b.max-g.height));
        g.height+=growth;delta-=growth;
        if(delta>0&&scroller)pendingScroll=delta;
      }else if(delta<0){
        let down=-delta;
        // At full height, read back to the top, then continue folding in the SAME gesture.
        // A title/handle drag always moves the panel, even when content is scrolled.
        if(!g.force&&g.height>=b.max-1&&scroller?.scrollTop>0){
          const consumed=Math.min(down,scroller.scrollTop);scroller.scrollTop-=consumed;down-=consumed;
        }
        const shrink=Math.min(down,Math.max(0,g.height-b.min));g.height-=shrink;down-=shrink;
        if(down>0&&scroller)scroller.scrollTop=Math.max(0,scroller.scrollTop-down);
      }
      const now=performance.now();
      g.velocity=Math.max(-2.5,Math.min(2.5,(g.height-oldHeight)/Math.max(8,now-g.lastTime)));
      if(g.height!==oldHeight){g.resized=true;options.size(g.height);if(pendingScroll)options.flush?.();}
      if(pendingScroll&&scroller)scroller.scrollTop+=pendingScroll;
      g.lastY=point.clientY;g.lastTime=now;
    }
    // Window capture runs before document-level photo/link handlers.
    window.addEventListener('click',event=>{
      if(event.detail!==0&&Date.now()<suppressUntil&&panel.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    panel.addEventListener('dragstart',event=>{if(gesture)event.preventDefault();});
    panel.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.isPrimary&&event.button===0)begin(event,event,'pointer');});
    panel.addEventListener('pointermove',event=>{if(gesture?.kind==='pointer'&&event.pointerId===gesture.id)move(event,event);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,event=>{if(gesture?.kind==='pointer'&&event.pointerId===gesture.id)finish(type!=='pointerup');});
    panel.addEventListener('touchstart',event=>{if(event.touches.length!==1){finish(true);return;}begin(event,event.touches[0],'touch');},{passive:true});
    panel.addEventListener('touchmove',event=>{if(gesture?.kind!=='touch')return;if(event.touches.length!==1){finish(true);return;}move(event,[...event.touches].find(t=>t.identifier===gesture.id));},{passive:false});
    for(const type of ['touchend','touchcancel'])panel.addEventListener(type,event=>{
      if(gesture?.kind!=='touch'||![...event.changedTouches].some(t=>t.identifier===gesture.id))return;
      if(gesture.active&&event.cancelable)event.preventDefault();finish(type==='touchcancel');
    },{passive:false});
    const cancel=()=>finish(true);
    for(const type of ['blur','pagehide','resize'])window.addEventListener(type,cancel);
    bindings.set(panel,{end:cancel});
  }
  function bind(panel,options){
    if(bindings.has(panel))return;
    if(options.anywhere){bindAnywhere(panel,options);return;}
    let gesture=null,suppressUntil=0;
    function end(canceled=false){
      if(!gesture)return;
      const old=gesture;gesture=null;
      try{if(old.kind==='pointer' && panel.hasPointerCapture(old.id))panel.releasePointerCapture(old.id)}catch{}
      if(old.resizing){
        suppressUntil=Date.now()+500;
        const recent=performance.now()-old.lastTime<100;
        options.end?.({canceled,kind:old.kind,velocity:recent?old.velocity:0});
      }
      options.afterEnd?.();
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
      if(!target || (options.handlesOnly && !target.closest(options.headerSelector||headers)) || (!options.includeHeaders && target.closest(headers)) || target.closest(controls))return;
      // Do not intercept the native desktop scrollbar thumb.
      const rect=target.getBoundingClientRect();
      if(kind==='pointer' && target.clientWidth>0 && target.offsetWidth>target.clientWidth+2 && point.clientX>=rect.left+target.clientLeft+target.clientWidth)return;
      options.prepare?.();
      gesture={kind,id:kind==='touch'?point.identifier:event.pointerId,x:point.clientX,y:point.clientY,h:panel.getBoundingClientRect().height,top:atTop(target),force:!!(options.headerSelector && target.closest(options.headerSelector)),resizing:false,scrolling:false,lastY:point.clientY,lastTime:performance.now(),velocity:0};
    }
    function move(event,point){
      const g=gesture;if(!g || !point || g.scrolling)return;
      const dy=g.y-point.clientY,dx=point.clientX-g.x;
      if(!g.resizing){
        if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
        const bounds=options.bounds();
        // Lock one gesture to scrolling or resizing. No sudden takeover midway.
        if(Math.abs(dx)>=Math.abs(dy) || (!g.force && ((dy>0 && g.h>=bounds.max-2) || (dy<0 && (!g.top || g.h<=bounds.min+2)))) || !event.cancelable){g.scrolling=true;return}
        g.resizing=true;
        options.start?.();
        if(g.kind==='pointer')try{panel.setPointerCapture(g.id)}catch{}
      }
      event.preventDefault();
      const now=performance.now(),elapsed=Math.max(8,now-g.lastTime);
      g.velocity=Math.max(-2.5,Math.min(2.5,(g.lastY-point.clientY)/elapsed));
      g.lastY=point.clientY;g.lastTime=now;
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
    for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,event=>{if(gesture?.kind==='pointer' && gesture.id===event.pointerId)end(type!=='pointerup')});
    panel.addEventListener('touchstart',event=>{
      if(event.touches.length!==1){end(true);return}
      begin(event,event.touches[0],'touch');
    },{passive:true});
    panel.addEventListener('touchmove',event=>{
      if(gesture?.kind!=='touch')return;
      if(event.touches.length!==1){end(true);return}
      move(event,Array.from(event.touches).find(point=>point.identifier===gesture.id));
    },{passive:false});
    for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
      if(gesture?.kind==='touch' && Array.from(event.changedTouches).some(point=>point.identifier===gesture.id))end(type==='touchcancel');
    },{passive:true});
    const cancel=()=>end(true);
    window.addEventListener('blur',cancel);
    window.addEventListener('pagehide',cancel);
    window.addEventListener('resize',cancel);
    bindings.set(panel,{end:cancel});
  }
  window.BodySheetDrag={bind,cancel:panel=>bindings.get(panel)?.end()};
})();
