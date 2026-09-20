const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=path=>fs.readFileSync(path,'utf8');
(async()=>{
for(const kind of ['touch','pointer']){
 const dom=new JSDOM(read('index.html'),{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false});
 await new Promise(r=>d.addEventListener('DOMContentLoaded',r,{once:true}));
 const run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id};
 w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id};
 w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null};
 d.querySelector('.mapwrap').getBoundingClientRect=()=>({height:700,bottom:700});
 d.querySelector('.content').getBoundingClientRect=()=>({height:700,bottom:700});
 d.querySelectorAll('.modalback').forEach(p=>p.getBoundingClientRect=()=>({height:700}));
 const detail=d.getElementById('detail');detail.classList.add('show');
 detail.innerHTML='<div class="detailHeader">업소 이름</div><div id="detailBody"></div>';
 run('let detailExpanded=false;function positionSelectedPlaceInView(){}function syncDetailPanelLayout(){window.DetailSheetResize.sync()}');
 const panels=[detail,...d.querySelectorAll('#businessSide,#areaLegend,#areaPanel,.modalback .modal,dialog')];
 for(const p of panels){
   p.classList.remove('mobileCollapsed');
   p.getBoundingClientRect=()=>({height:parseFloat(p.style.getPropertyValue(p===detail?'--sheet-height':'--menu-height'))||300,bottom:676,left:0});
   const body=d.createElement('div');body.className='bodyFixture';body.innerHTML='<p class="description">본문 업소 정보</p><div class="scrollFixture"><span>스크롤 본문</span></div><button type="button">탭 동작</button><input><textarea></textarea><a href="#test"><img alt="사진"></a>';
   p.append(body);
 }
 for(const file of ['body-sheet-drag','detail-resize','menu-resize'])run(read('assets/js/'+file+'.js'));
 w.DetailSheetResize.sync();
 const touch=(id=1,x=100,y=500)=>({identifier:id,clientX:x,clientY:y});
 function send(target,type,x=100,y=500,extra={}){
   const event=new w.Event((kind==='touch'?'touch':'pointer')+type,{bubbles:true,cancelable:true});
   if(kind==='touch')Object.assign(event,{touches:type==='end'||type==='cancel'?[]:[touch(1,x,y)],changedTouches:[touch(1,x,y)]},extra);
   else Object.assign(event,{pointerType:'mouse',pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y},extra);
   target.dispatchEvent(event);return event;
 }
 const begin=target=>send(target,kind==='touch'?'start':'down');
 const end=target=>send(target,kind==='touch'?'end':'up');
 function drag(target,x,y){begin(target);const event=send(target,'move',x,y);end(target);return event}
 for(const p of panels){
   const prop=p===detail?'--sheet-height':'--menu-height',body=p.querySelector('.bodyFixture'),description=body.querySelector('.description');
   // Content is always native scrolling; only explicit handles/title resize.
   assert.equal(drag(description,100,400).defaultPrevented,false,'body scroll never resizes '+p.id);
   assert.equal(p.style.getPropertyValue(prop),'');
   const header=p.querySelector(p===detail?'.detailResizeHandle':'.menuResizeGrip');
   if(p.hasAttribute('data-no-sheet-resize')){
     assert.equal(header,null,'fixed membership dialog has no resize grip');
     continue;
   }
   assert(header,'explicit grip exists '+p.id);
   assert(drag(header,100,400).defaultPrevented,'grip resizes '+p.id);
   assert.equal(p.style.getPropertyValue(prop),'400px');
   const previous=p.style.getPropertyValue(prop);
   for(const control of body.querySelectorAll('input,textarea,button,a,img')){
     assert.equal(drag(control,100,300).defaultPrevented,false,'controls do not resize');
     assert.equal(p.style.getPropertyValue(prop),previous);
   }
   const scroll=body.querySelector('.scrollFixture');scroll.scrollTop=50;
   assert.equal(drag(scroll.firstChild,100,580).defaultPrevented,false);
   assert.equal(drag(description,180,499).defaultPrevented,false);
   assert.equal(p.style.getPropertyValue(prop),previous);
   await new Promise(r=>setTimeout(r,510));
   const button=body.querySelector('button');let clicks=0;button.addEventListener('click',()=>clicks++);
   begin(button);end(button);button.click();assert.equal(clicks,1,'tap preserved');
   description.innerHTML='<span>새로 그린 본문</span>';
   assert.equal(drag(description.firstChild,100,550).defaultPrevented,false,'rerendered body scrolls');
   assert.equal(p.style.getPropertyValue(prop),previous);
   begin(header);send(header,'move',100,550);send(header,'cancel');
   assert(!p.classList.contains('menuDragging'));assert(!p.classList.contains('detailDragging'));
 }
 if(kind==='touch'){
   const target=detail.querySelector('.description'),height=detail.style.getPropertyValue('--sheet-height');
   begin(target);send(target,'move',100,400,{touches:[touch(),touch(2,160,500)]});assert.equal(detail.style.getPropertyValue('--sheet-height'),height,'pinch is not a sheet resize');
 }
 await new Promise(resolve=>setImmediate(resolve));
 dom.window.close();
}
console.log('PASS touch/mouse grip-only resize, native body scrolling, fixed membership dialog, controls/photo taps, cancellation, pinch and rerendered content (DOM simulation)');
})().catch(error=>{console.error(error);process.exitCode=1});
