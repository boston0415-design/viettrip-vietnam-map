(() => {
 const configs=[['#businessSide','.mobileSideHead,.browseHeading'],['#areaLegend','#areaLegendTitle'],['#areaPanel','.areaPanelHead'],['.modalback .modal','h3'],['dialog','.travellerDialogHead']];
 const records=new Map();let active=null;
 function limits(p){
   const container=p.closest('.content')||p.closest('.modalback');
   const available=container?.getBoundingClientRect().height||window.visualViewport?.height||innerHeight;
   return {min:Math.min(150,available-32),max:Math.max(100,available-32)};
 }
 function size(p,value){
   const b=limits(p);const h=Math.round(Math.max(Math.max(80,b.min),Math.min(b.max,value)));
   p.style.setProperty('--menu-height',h+'px');p.classList.add('menuSized');
   const grip=records.get(p).grip;
   grip.setAttribute('aria-valuenow',h);grip.setAttribute('aria-valuemin',Math.max(80,b.min));grip.setAttribute('aria-valuemax',b.max);
 }
 function end(){
   if(!active)return;
   const a=active;active=null;a.p.classList.remove('menuDragging');
   try{if(a.source.hasPointerCapture(a.id))a.source.releasePointerCapture(a.id)}catch{}
 }
 function bind(p,source,handle){
   if(source.dataset.menuDragBound)return;source.dataset.menuDragBound='true';
   source.classList.add('menuResizeHeader');let suppressUntil=0;
   source.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
   source.addEventListener('pointerdown',e=>{
     if(!e.isPrimary||e.button!==0||e.target.closest('input,select,textarea,a'))return;
     if(!handle&&e.target.closest('button')?.id!=='areaLegendTitle'&&e.target.closest('button'))return;
     active={p,source,id:e.pointerId,y:e.clientY,h:p.getBoundingClientRect().height,moved:false};
   });
   source.addEventListener('pointermove',e=>{
     const a=active;if(!a||a.source!==source||a.id!==e.pointerId)return;
     const delta=a.y-e.clientY;if(!a.moved&&Math.abs(delta)<5)return;
     if(!a.moved){
       if(p.id==='areaLegend'&&p.classList.contains('mobileCollapsed'))document.getElementById('areaLegendTitle').click();
       source.setPointerCapture(e.pointerId);a.moved=true;p.classList.add('menuDragging');
     }
     suppressUntil=Date.now()+500;size(p,a.h+delta);e.preventDefault();
   });
   for(const type of ['pointerup','pointercancel','lostpointercapture'])source.addEventListener(type,e=>{if(active?.id===e.pointerId)end()});
 }
 function scan(){
   for(const [selector,header] of configs)for(const p of document.querySelectorAll(selector)){
     if(!records.has(p)){
       const grip=document.createElement('div');grip.className='menuResizeGrip';grip.tabIndex=0;
       grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');grip.setAttribute('aria-label','메뉴 높이 조절');
       grip.innerHTML='<span aria-hidden="true"></span>';p.prepend(grip);p.classList.add('menuResizable');records.set(p,{grip});
       bind(p,grip,true);
       grip.addEventListener('keydown',e=>{
         const b=limits(p),h=p.getBoundingClientRect().height,next={ArrowUp:h+40,ArrowDown:h-40,Home:b.min,End:b.max}[e.key];
         if(next===undefined)return;e.preventDefault();
         if(p.id==='areaLegend'&&p.classList.contains('mobileCollapsed'))document.getElementById('areaLegendTitle').click();
         size(p,next);
       });
     }
     p.querySelectorAll(header).forEach(h=>bind(p,h,false));
   }
 }
 function start(){scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 window.addEventListener('blur',end);
 window.addEventListener('resize',()=>{end();for(const p of records.keys())if(p.classList.contains('menuSized'))size(p,parseFloat(p.style.getPropertyValue('--menu-height')))});
})();
