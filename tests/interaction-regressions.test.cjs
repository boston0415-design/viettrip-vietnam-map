const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
for(const width of [390,1440])for(const kind of ['touch','pointer']){
 const dom=new JSDOM('<div class="content desktopListCollapsed"><aside id="businessSide"><section id="detail" class="show"><div class="detailHeader">업소</div><div id="detailBody">본문</div></section></aside></div><dialog id="businessShareDialog"><p>공유 본문</p><button>정보 복사</button><input></dialog><div class="mapwrap"></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,side=d.querySelector('aside'),dialog=d.querySelector('dialog');w.matchMedia=()=>({matches:width<=900});w.setMobileLegendExpanded=()=>{};
 d.querySelector('.content').getBoundingClientRect=()=>({height:700,bottom:800,top:100});
 for(const p of [side,dialog])p.getBoundingClientRect=()=>({height:parseFloat(p.style.getPropertyValue('--menu-height'))||300,bottom:800,right:350});
 for(const f of ['body-sheet-drag','menu-resize'])w.eval(fs.readFileSync('assets/js/'+f+'.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 function send(target,type,y){const e=new w.Event(kind+type,{bubbles:true,cancelable:true});const point={identifier:1,clientX:80,clientY:y};Object.assign(e,kind==='touch'?{touches:type==='end'?[]:[point],changedTouches:[point]}:{pointerType:'mouse',pointerId:1,isPrimary:true,button:0,...point});target.dispatchEvent(e);return e;}
 function drag(target,from,to){send(target,kind==='touch'?'start':'down',from);send(target,'move',to);send(target,kind==='touch'?'end':'up',to);}
 for(const p of [side,dialog]){
  const body=p.querySelector('p')||p.querySelector('#detailBody');drag(body,600,400);assert(parseFloat(p.style.getPropertyValue('--menu-height'))>=500,'body drag expands '+p.id);
  p.style.setProperty('--menu-height',p===side?'686px':'736px');p.scrollTop=30;
  drag(body,400,520);assert(parseFloat(p.style.getPropertyValue('--menu-height'))<(p===side?686:736),'body folds after scroll reaches top in same gesture');
 }
 const old=dialog.style.getPropertyValue('--menu-height');drag(dialog.querySelector('input'),500,200);assert.equal(dialog.style.getPropertyValue('--menu-height'),old,'typing input never resizes');
 w.$=s=>d.querySelector(s);w.detailExpanded=true;w.isMobileMapLayout=()=>width<=900;w.ListLayout={setCollapsed:v=>d.querySelector('.content').classList.toggle('desktopListCollapsed',v)};
 const source=fs.readFileSync('assets/js/04-rendering.js','utf8');w.eval(source.slice(source.indexOf('function syncDetailPanelLayout(){'),source.indexOf('function setDetailExpanded(')));
 w.syncDetailPanelLayout();assert(!d.querySelector('.content').classList.contains('desktopListCollapsed'));assert(side.classList.contains('mobileOpen'));assert.equal(d.querySelector('#detailBody').hidden,false);
 dom.window.close();
}
console.log('PASS desktop/mobile mouse/touch: body resize, scroll-edge folding, share dialog drag, input exclusion, collapsed detail reopening');
