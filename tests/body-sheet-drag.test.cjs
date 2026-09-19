const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=path=>fs.readFileSync(path,'utf8');
(async()=>{
for(const kind of ['touch','pointer']){
 const dom=new JSDOM(read('index.html'),{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
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
   assert.equal(drag(description,100,400).defaultPrevented,true,'body upward drag resizes '+p.id);
   assert.equal(p.style.getPropertyValue(prop),'400px');
   assert.equal(drag(description,100,550).defaultPrevented,true);assert.equal(p.style.getPropertyValue(prop),'350px');
   assert(!p.classList.contains('menuDragging'));assert(!p.classList.contains('detailDragging'));
   const previous=p.style.getPropertyValue(prop),scroll=body.querySelector('.scrollFixture');scroll.scrollTop=50;
   assert.equal(drag(scroll.firstChild,100,580).defaultPrevented,false,'mid-content downward scrolling wins');assert.equal(p.style.getPropertyValue(prop),previous);
   scroll.scrollTop=0;begin(scroll.firstChild);send(scroll.firstChild,'move',180,499);assert.equal(send(scroll.firstChild,'move',180,300).defaultPrevented,false,'horizontal intent stays scrolling');end(scroll.firstChild);
   assert.equal(p.style.getPropertyValue(prop),previous);
   for(const control of body.querySelectorAll('input,textarea')){assert.equal(drag(control,100,300).defaultPrevented,false);assert.equal(p.style.getPropertyValue(prop),previous)}
   // Taps still activate buttons; drags starting on buttons must not activate them.
   const button=body.querySelector('button');let clicks=0;button.addEventListener('click',()=>clicks++);
   await new Promise(r=>setTimeout(r,510));begin(button);end(button);button.click();assert.equal(clicks,1);
   drag(button,100,450);button.click();assert.equal(clicks,1,'drag does not activate the button');
   drag(description,100,-5000);const maxHeight=p.style.getPropertyValue(prop);
   assert.equal(drag(description,100,400).defaultPrevented,false,'at maximum height upward gesture scrolls content');assert.equal(p.style.getPropertyValue(prop),maxHeight);
   begin(description);send(description,'move',100,550);send(description,'cancel');assert(!p.classList.contains('menuDragging'));assert(!p.classList.contains('detailDragging'));
   // A re-rendered child inherits the panel-level gesture binding.
   description.innerHTML='<span>새로 그린 본문</span>';assert.equal(drag(description.firstChild,100,550).defaultPrevented,true);
 }
 if(kind==='touch'){
   const target=detail.querySelector('.description'),height=detail.style.getPropertyValue('--sheet-height');
   begin(target);send(target,'move',100,400,{touches:[touch(),touch(2,160,500)]});assert.equal(detail.style.getPropertyValue('--sheet-height'),height,'pinch is not a sheet resize');
 }
 dom.window.close();
}
console.log('PASS touch/mouse body gestures on every menu, direction arbitration, scrolled content, horizontal rails, controls/taps, click suppression, limits, cancellation, pinch and rerendered content (DOM simulation)');
})().catch(error=>{console.error(error);process.exitCode=1});
