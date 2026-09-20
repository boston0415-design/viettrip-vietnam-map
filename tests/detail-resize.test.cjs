const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
for(const mobile of [true,false]){
 const dom=new JSDOM('<div class="mapwrap"><div id="detail" class="show"><div class="detailHeader"><button class="businessReviewName"><span>업소 이름</span></button><button class="detailClose">닫기</button></div><div id="detailBody"><p>업소 설명</p><button class="action">길찾기</button></div></div></div>',{runScripts:'outside-only'});
 const w=dom.window,p=w.document.getElementById('detail'),map=w.document.querySelector('.mapwrap'),context=dom.getInternalVMContext();
 const run=code=>vm.runInContext(code,context);let now=1000,mapHeight=700,reduced=false;
 w.matchMedia=query=>({matches:query.includes('reduced-motion')?reduced:mobile});
 w.performance.now=()=>now;w.Date.now=()=>now;
 let id=0;const frames=new Map();
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};w.cancelAnimationFrame=id=>frames.delete(id);
 function advance(ms=16){now+=ms;const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(now))}
 map.getBoundingClientRect=()=>({height:mapHeight,bottom:mapHeight});
 p.getBoundingClientRect=()=>({height:parseFloat(p.style.getPropertyValue('--sheet-height'))||220,bottom:mapHeight-24});
 w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id};
 w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id};
 w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null};
 run('let detailExpanded=false,pans=0,syncs=0,renders=0;function positionSelectedPlaceInView(){pans++}function syncDetailPanelLayout(){syncs++;window.DetailSheetResize.sync()}function renderDetail(){renders++}');
 for(const file of ['body-sheet-drag','detail-resize'])run(fs.readFileSync('assets/js/'+file+'.js','utf8'));
 w.DetailSheetResize.sync();const handle=p.firstElementChild,title=p.querySelector('.businessReviewName span'),body=p.querySelector('#detailBody p');
 const height=()=>parseFloat(p.style.getPropertyValue('--sheet-height'));
 function event(target,type,y=500){
   const e=new w.Event(mobile?{down:'touchstart',move:'touchmove',up:'touchend',cancel:'touchcancel'}[type]:'pointer'+type,{bubbles:true,cancelable:true});
   if(mobile){const t={identifier:1,clientX:100,clientY:y};Object.assign(e,{touches:['up','cancel'].includes(type)?[]:[t],changedTouches:[t]})}
   else Object.assign(e,{pointerId:1,clientX:100,clientY:y,button:0,isPrimary:true,pointerType:'mouse'});
   target.dispatchEvent(e);return e;
 }
 // Genuine TouchEvent path on the nested title span, rather than a fake touch PointerEvent.
 let clicks=0;p.querySelector('.businessReviewName').addEventListener('click',()=>clicks++);
 event(title,'down');event(title,'up');title.click();assert.equal(clicks,1);
 event(title,'down',500);advance(80);event(title,'move',440);advance(80);event(title,'move',360);
 assert.equal(height(),280,'moves are batched to the next animation frame');advance(16);assert.equal(height(),360);
 assert(p.classList.contains('detailDragging'));assert.equal(run('detailExpanded'),true);
 const syncCount=run('syncs');advance(16);event(title,'move',350);advance(16);assert.equal(run('syncs'),syncCount,'no full media/layout sync each frame');
 w.DetailSheetResize.deferRefresh();event(title,'up',350);title.click();assert.equal(clicks,1,'title drag does not open reviews');
 if(mobile){
   const before=height();assert(p.classList.contains('detailSettling'));advance(80);assert(height()>before);assert(height()<664);
   advance(200);assert.equal(Math.round(height()),412);assert(!p.classList.contains('detailSettling'));
 }else assert.equal(height(),370);
 assert.equal(run('renders'),1,'deferred DB repaint resumes only after the gesture settles');
 // Title drag can shrink even when the body has been scrolled.
 p.querySelector('#detailBody').scrollTop=200;
 event(title,'down',300);event(title,'move',450);advance(16);assert(p.classList.contains('detailDragging'));event(title,'cancel',450);
 assert(!p.classList.contains('detailDragging'));assert(!p.classList.contains('detailSettling'));
 // Body scrolling stays native when content is not at the top.
 const previous=height();event(body,'down',300);assert.equal(event(body,'move',450).defaultPrevented,false);event(body,'up');assert.equal(height(),previous);
 // An upward body swipe expands even when its content was previously scrolled.
 event(body,'down',500);assert.equal(event(body,'move',400).defaultPrevented,true);advance(16);assert(height()>previous);event(body,'cancel',400);
 p.querySelector('#detailBody').scrollTop=0;
 // Reset/close cancels all frames, including in-flight inertia.
 event(body,'down',500);event(body,'move',250);event(body,'up',250);w.DetailSheetResize.reset();advance(500);
 assert.equal(p.style.getPropertyValue('--sheet-height'),'');assert.equal(w.DetailSheetResize.isInteracting(),false);
 // Header/body controls retain keyboard accessibility, limits and viewport clamping.
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',cancelable:true}));assert.equal(height(),180);
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',cancelable:true}));assert.equal(height(),664);
 mapHeight=350;w.dispatchEvent(new w.Event('resize'));assert.equal(height(),314);
 if(mobile){
   mapHeight=700;w.DetailSheetResize.reset();reduced=true;event(body,'down',500);advance(100);event(body,'move',300);event(body,'up',300);
   assert.equal(height(),664);assert(!p.classList.contains('detailSettling'),'reduced-motion skips animation');
   reduced=false;w.DetailSheetResize.reset();event(title,'down',500);advance(100);event(title,'move',350);event(title,'up',350);advance(60);
   const interrupted=height();event(title,'down',400);assert(!p.classList.contains('detailSettling'));advance(500);assert.equal(height(),interrupted,'new touch immediately stops settling');event(title,'up',400);
 }
 advance(600);title.click();assert.equal(clicks,2,'a later intentional title tap still works');
 dom.window.close();
}
console.log('PASS real touch-event/mouse title and body paths, frame batching, momentum snap, interruption, reduced motion, deferred refresh, scroll priority, taps, keyboard, bounds and cancellation (DOM simulation)');
