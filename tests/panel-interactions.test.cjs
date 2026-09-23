// Direct recognizer regression: body/title/buttons/photos resize first; taps do not.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
for(const kind of ['touch','pointer']){
 const dom=new JSDOM('<section id="panel"><header><button><span>업소 이름</span></button></header><article><p>본문</p><a href="#photo"><img></a><button>예약</button><input><textarea></textarea></article></section>',{runScripts:'outside-only'});
 const w=dom.window,p=w.document.getElementById('panel');let h=100,ends=0;
 let now=1000,id=0,reduced=false;const frames=new Map();w.performance.now=()=>now;w.matchMedia=()=>({matches:reduced});
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};w.cancelAnimationFrame=id=>frames.delete(id);
 const advance=ms=>{now+=ms;const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(now))};
 p.getBoundingClientRect=()=>({height:h,width:360,left:0,right:360});
 p.setPointerCapture=()=>{};p.hasPointerCapture=()=>false;
 Object.defineProperty(p,'scrollHeight',{get:()=>1200});Object.defineProperty(p,'clientHeight',{get:()=>h});
 vm.runInContext(fs.readFileSync('assets/js/body-sheet-drag.js','utf8'),dom.getInternalVMContext());
 w.BodySheetDrag.bind(p,{anywhere:true,headerSelector:'header',bounds:()=>({min:60,max:500}),size:value=>h=value,end:()=>ends++});
 function event(target,type,y=500,x=100,extra={}){
  const e=new w.Event(kind==='touch'?({down:'touchstart',move:'touchmove',up:'touchend',cancel:'touchcancel'})[type]:'pointer'+type,{bubbles:true,cancelable:true});
  const t={identifier:1,clientX:x,clientY:y};Object.assign(e,kind==='touch'?{touches:['up','cancel'].includes(type)?[]:[t],changedTouches:[t]}:{pointerId:1,clientX:x,clientY:y,button:0,isPrimary:true,pointerType:'mouse'},extra);target.dispatchEvent(e);return e;
 }
 for(const selector of ['header span','article p','article img','article button']){
  const target=p.querySelector(selector);h=100;p.scrollTop=40;
  event(target,'down');assert(event(target,'move',400).defaultPrevented);assert.equal(h,200,selector+' expands whole panel');assert.equal(p.scrollTop,40,'no scrolling inside compact panel');event(target,'up',400);
  event(target,'down');event(target,'move',550);event(target,'up',550);assert.equal(h,150,selector+' folds whole panel');
 }
 const body=p.querySelector('article p'),title=p.querySelector('header span');h=100;p.scrollTop=0;
 event(body,'down',700);event(body,'move',200);assert.equal(h,500);assert.equal(p.scrollTop,100,'same gesture crosses from panel expansion to body scrolling');event(body,'move',500);assert.equal(p.scrollTop,0);assert.equal(h,300,'same gesture scrolls back then folds');event(body,'up',500);
 h=500;p.scrollTop=150;event(title,'down');event(title,'move',600);event(title,'up',600);assert.equal(h,400,'title folds even when full-size body is scrolled');
 for(const selector of ['input','textarea']){h=100;const el=p.querySelector(selector);event(el,'down');assert(!event(el,'move',350).defaultPrevented);event(el,'up');assert.equal(h,100,'typing and native fields stay usable');}
 h=100;event(body,'down');assert(!event(body,'move',499,170).defaultPrevented);event(body,'up');assert.equal(h,100,'horizontal gestures are not hijacked');
 const button=p.querySelector('header button');let clicks=0;button.onclick=()=>clicks++;event(title,'down');event(title,'up');button.click();assert.equal(clicks,1,'deliberate name tap preserved');
 event(body,'down');event(body,'move',440);event(body,'cancel',440);assert(ends>0,'cancel releases gesture state');
 if(kind==='touch'){h=100;event(body,'down');event(body,'move',400,100,{touches:[{identifier:1,clientX:100,clientY:400},{identifier:2,clientX:160,clientY:400}]});assert.equal(h,100,'pinch is not panel resize');}
 h=500;p.scrollTop=0;event(body,'down',500);advance(60);event(body,'move',410);event(body,'up',410);
 const scroll=p.scrollTop;advance(16);assert(p.scrollTop>scroll,'a released content swipe continues with inertia');
 event(body,'down',400);const stopped=p.scrollTop;advance(100);assert.equal(p.scrollTop,stopped,'fresh contact immediately interrupts inertia');event(body,'cancel',400);
 p.scrollTop=0;event(body,'down',500);advance(60);event(body,'move',410);advance(180);event(body,'up',410);const held=p.scrollTop;advance(50);assert.equal(p.scrollTop,held,'holding before release must not fling');
 reduced=true;p.scrollTop=0;event(body,'down',500);advance(60);event(body,'move',410);event(body,'up',410);const still=p.scrollTop;advance(50);assert.equal(p.scrollTop,still,'reduced-motion skips content inertia');
 dom.window.close();
}
console.log('PASS touch and mouse: any-area expand-first, same-gesture scroll handoff, title folding, tap distinction, text inputs, horizontal swipes and pinch');
