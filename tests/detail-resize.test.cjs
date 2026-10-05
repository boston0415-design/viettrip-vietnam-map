const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
for(const mobile of [true,false]){
 const dom=new JSDOM('<div class="mapwrap"><div id="detail" class="show"><div class="detailHeader"><button class="businessReviewName"><span>업소 이름</span></button><button class="detailClose">닫기</button></div><div id="detailBody"><p>업소 설명</p><button class="action">길찾기</button></div></div></div>',{runScripts:'outside-only'});
 const w=dom.window,p=w.document.getElementById('detail'),map=w.document.querySelector('.mapwrap'),context=dom.getInternalVMContext();
 const run=code=>vm.runInContext(code,context);let now=1000,mapHeight=700,reduced=false;
 let viewportHeight=null;Object.defineProperty(w,'innerHeight',{get:()=>viewportHeight??mapHeight});
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
 // Genuine touch/mouse gestures move the sheet from titles as well as the grip.
 let clicks=0;p.querySelector('.businessReviewName').addEventListener('click',()=>clicks++);
 event(title,'down');event(title,'up');title.click();assert.equal(clicks,1);
 event(title,'down',500);assert.equal(event(title,'move',360).defaultPrevented,true);event(title,'cancel',360);assert.equal(height(),360,'title moves the sheet');w.DetailSheetResize.reset();
 event(handle,'down',500);advance(80);event(handle,'move',440);advance(80);event(handle,'move',360);
 assert.equal(height(),280,'moves are batched to the next animation frame');advance(16);assert.equal(height(),360);
 assert(p.classList.contains('detailDragging'));assert.equal(run('detailExpanded'),true);
 const syncCount=run('syncs');advance(16);event(handle,'move',350);advance(16);assert.equal(run('syncs'),syncCount,'no full media/layout sync each frame');
 w.DetailSheetResize.deferRefresh();event(handle,'up',350);assert.equal(clicks,1,'drag does not generate a click');
 const before=height();assert(!p.classList.contains('detailSettling'));advance(280);assert.equal(height(),before,'sheet stops exactly where released');
 assert.equal(run('renders'),1,'deferred DB repaint resumes only after the gesture settles');
 // Grip drag can shrink even when the body has been scrolled.
 p.querySelector('#detailBody').scrollTop=200;
 event(handle,'down',300);event(handle,'move',450);advance(16);assert(p.classList.contains('detailDragging'));event(handle,'cancel',450);
 assert(!p.classList.contains('detailDragging'));assert(!p.classList.contains('detailSettling'));
 // Body drags move an intermediate sheet even when content was scrolled.
 const previous=height();event(body,'down',300);assert.equal(event(body,'move',330).defaultPrevented,true);event(body,'cancel',330);assert(height()<previous,'compact body drag moves panel down');
 // An upward body swipe expands before scrolling.
 const small=height();event(body,'down',500);assert.equal(event(body,'move',400).defaultPrevented,true);advance(16);assert(height()>small,'compact body drag expands before scrolling');event(body,'cancel',400);
 p.querySelector('#detailBody').scrollTop=0;
 // Expanded is not a drag lock: body drags resize at intermediate heights.
 Object.defineProperty(p,'scrollHeight',{get:()=>1600});
 Object.defineProperty(p,'clientHeight',{get:()=>p.getBoundingClientRect().height});
 p.classList.add('detailExpanded');p.scrollTop=100;
 const readingHeight=height();event(body,'down',300);event(body,'move',460);event(body,'cancel',460);
 assert(height()<readingHeight,'expanded body drag folds the sheet');
 const foldedHeight=height();
 event(body,'down',500);event(body,'move',400);event(body,'cancel',400);
 assert.equal(height(),foldedHeight+100,'expanded body drag raises the sheet first');
 // At maximum, read long content, then continue folding after reaching its top.
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',cancelable:true}));p.scrollTop=100;
 event(body,'down',300);event(body,'move',350);event(body,'cancel',350);
 assert.equal(height(),662);assert.equal(p.scrollTop,50);
 event(body,'down',300);event(body,'move',410);event(body,'cancel',410);
 assert.equal(p.scrollTop,0);assert.equal(height(),662,'reading gesture stays in scroll mode at the top');
 // A slow short drag rests where released, without snapping back.
 event(body,'down',400);advance(80);event(body,'move',425);advance(160);event(body,'up',425);advance(300);
 assert.equal(height(),637,'small held body drag stays at its released height');
 p.classList.remove('detailExpanded');p.scrollTop=0;
 // Reset/close cancels all frames, including in-flight inertia.
 event(handle,'down',500);event(handle,'move',250);event(handle,'up',250);w.DetailSheetResize.reset();advance(500);
 assert.equal(p.style.getPropertyValue('--sheet-height'),'');assert.equal(w.DetailSheetResize.isInteracting(),false);
 // Header/body controls retain keyboard accessibility, limits and viewport clamping.
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',cancelable:true}));assert.equal(height(),180);
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',cancelable:true}));assert.equal(height(),662);
 mapHeight=350;w.dispatchEvent(new w.Event('resize'));assert.equal(height(),312);
 if(mobile){
   mapHeight=700;w.DetailSheetResize.reset();reduced=true;event(handle,'down',500);advance(100);event(handle,'move',300);event(handle,'up',300);
   assert.equal(height(),420);assert(!p.classList.contains('detailSettling'),'reduced-motion skips animation');
   reduced=false;w.DetailSheetResize.reset();event(handle,'down',500);advance(100);event(handle,'move',350);event(handle,'up',350);advance(60);
   const interrupted=height();event(handle,'down',400);assert(!p.classList.contains('detailSettling'));advance(500);assert.equal(height(),interrupted,'new touch immediately stops settling');event(handle,'up',400);
 }
 advance(600);title.click();assert.equal(clicks,2,'a later intentional title tap still works');
 // A long heading scrolls with the content instead of forcing a tall minimum height.
 mapHeight=700;p.querySelector('.detailHeader').getBoundingClientRect=()=>({height:300});
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',cancelable:true}));assert.equal(height(),180);
 if(mobile){
  viewportHeight=900;p.getBoundingClientRect=()=>({height:height()||220,bottom:876});w.DetailSheetResize.reset();
  const header=w.document.createElement('header');header.className='top';header.getBoundingClientRect=()=>({bottom:100});w.document.body.prepend(header);w.DetailSheetResize.sync();
  handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',cancelable:true}));
  assert.equal(height(),768,'phone maximum stays eight pixels below the search header');
  assert.equal(p.style.getPropertyValue('--detail-top-gap'),'108px');
  header.getBoundingClientRect=()=>({bottom:160});w.dispatchEvent(new w.Event('resize'));
  assert.equal(height(),708,'viewport changes preserve the visible search header');
 }
 dom.window.close();
}
console.log('PASS touch/mouse title and body resizing, expand-first scrolling, free resting height, no post-release drift, interruption, reduced motion, deferred refresh, taps, keyboard, header clearance and cancellation (DOM simulation)');
