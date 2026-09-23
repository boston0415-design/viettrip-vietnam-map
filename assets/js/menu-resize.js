(() => {
 const configs=[['#businessSide','.mobileSideHead,.browseHeading'],['#areaLegend','#areaLegendTitle'],['#areaPanel','.areaPanelHead'],['.modalback:not(#reviewModal) .modal','h3'],['dialog:not([data-no-sheet-resize])','.travellerDialogHead']];
 const records=new Map();
 function limits(p){
   const container=p.closest('.content')||p.closest('.modalback');
   const available=container?.getBoundingClientRect().height||window.visualViewport?.height||innerHeight;
   const max=Math.max(80,available-(p.id==='businessSide'?110:32));return {min:Math.min(p.id==='businessSide'?110:150,max),max};
 }
 function size(p,value){
   const record=records.get(p),b=record.bounds||limits(p),h=Math.round(Math.max(b.min,Math.min(b.max,value)));
   p.style.setProperty('--menu-height',h+'px');p.classList.add('menuSized');
   record.grip.setAttribute('aria-valuenow',h);record.grip.setAttribute('aria-valuemin',b.min);record.grip.setAttribute('aria-valuemax',b.max);
 }
 function stop(p){
   const r=records.get(p);if(!r)return;
   if(r.frame!=null)cancelAnimationFrame(r.frame);r.frame=null;
   if(r.pending!=null){size(p,r.pending);r.pending=null;}
   if(r.animation!=null)cancelAnimationFrame(r.animation);r.animation=null;
   p.classList.remove('menuSettling');
 }
 function queue(p,value){
   const r=records.get(p);r.pending=value;
   if(r.frame==null)r.frame=requestAnimationFrame(()=>{r.frame=null;const next=r.pending;r.pending=null;size(p,next)});
 }
 function expand(p){if(p.id==='areaLegend'&&p.classList.contains('mobileCollapsed'))setMobileLegendExpanded(true)}
 function end(p,{canceled=false,velocity=0}={}){
   stop(p);const r=records.get(p);r.bounds=null;p.classList.remove('menuDragging');
   if(canceled)return;
   if(!['businessSide','areaLegend','areaPanel'].includes(p.id)&&!window.matchMedia('(max-width:900px)').matches)return;
   const start=parseFloat(p.style.getPropertyValue('--menu-height'));if(!Number.isFinite(start))return;
   const b=limits(p),projected=Math.max(b.min,Math.min(b.max,start+velocity*150));
   const stops=p.id==='businessSide'?[b.min,Math.max(b.min,b.max*.52),b.max]:null;
   const target=stops?stops.reduce((best,h)=>Math.abs(h-projected)<Math.abs(best-projected)?h:best,stops[0]):projected;
   if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){size(p,target);return;}
   if(Math.abs(target-start)<2)return;
   const began=performance.now();r.bounds=b;p.classList.add('menuSettling');
   function tick(now){const t=Math.min(1,(now-began)/260);size(p,start+(target-start)*(1-Math.pow(1-t,3)));if(t<1)r.animation=requestAnimationFrame(tick);else{r.animation=null;r.bounds=null;p.classList.remove('menuSettling')}}
   r.animation=requestAnimationFrame(tick);
 }
 function scan(){
   if(typeof document==='undefined')return;
   for(const [selector,header] of configs)for(const p of document.querySelectorAll(selector)){
     if(!records.has(p)){
       const grip=document.createElement('div');grip.className='menuResizeGrip';grip.tabIndex=0;
       grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');grip.setAttribute('aria-label','메뉴 높이 조절');
       grip.title=p.id==='businessSide'?'제목·업소명·본문을 위아래로 끌어 창 조절':'손잡이 또는 제목을 끌어 높이 조절 · 본문은 스크롤';grip.innerHTML='<span aria-hidden="true"></span>';p.prepend(grip);p.classList.add('menuResizable');records.set(p,{grip});
       window.BodySheetDrag?.bind(p,{
         anywhere:['businessSide','areaLegend','areaPanel'].includes(p.id),handlesOnly:true,includeHeaders:true,headerSelector:header+',.menuResizeGrip',bounds:()=>records.get(p).bounds||limits(p),
         prepare(){stop(p);records.get(p).bounds=limits(p)},
         start(){expand(p);p.classList.add('menuDragging')},size:value=>queue(p,value),flush:()=>stop(p),end:info=>end(p,info),afterEnd(){records.get(p).bounds=null}
       });
       grip.addEventListener('keydown',event=>{
         const b=limits(p),h=p.getBoundingClientRect().height,next={ArrowUp:h+40,ArrowDown:h-40,Home:b.min,End:b.max}[event.key];
         if(next===undefined)return;event.preventDefault();stop(p);expand(p);size(p,next);
       });
     }
     p.querySelectorAll(header).forEach(h=>h.classList.add('menuResizeHeader'));
   }
 }
 function start(){scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 for(const event of ['blur','pagehide','resize'])window.addEventListener(event,()=>{for(const p of records.keys()){window.BodySheetDrag?.cancel(p);stop(p);records.get(p).bounds=null;if(event==='resize'&&p.classList.contains('menuSized'))size(p,parseFloat(p.style.getPropertyValue('--menu-height')))}});
})();
