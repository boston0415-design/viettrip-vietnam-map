const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{for(const mobile of [false,true]){
 const dom=new JSDOM('<div class="content"><aside id="businessSide"><section id="detail" class="show"><div class="detailHeader"><h2>긴 업소 이름</h2><button>목록</button></div><div id="detailBody"><p>본문</p><input></div></section></aside></div>',{runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document,side=d.getElementById('businessSide'),detail=d.getElementById('detail');
 w.matchMedia=()=>({matches:mobile});w.renderDetail=()=>refreshes++;let refreshes=0;w.detailExpanded=true;w.positionSelectedPlaceInView=()=>{};w.syncDetailPanelLayout=()=>{};w.setMobileLegendExpanded=()=>{};
 d.querySelector('.content').getBoundingClientRect=()=>({height:700,bottom:800,top:100});side.getBoundingClientRect=()=>({height:parseFloat(side.style.getPropertyValue('--menu-height'))||350,bottom:800,top:450,right:350});
 for(const file of ['body-sheet-drag','detail-resize','menu-resize'])w.eval(fs.readFileSync('assets/js/'+file+'.js','utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));w.DetailSheetResize.sync();
 const scroll=detail.querySelector('.detailScroll');assert(scroll);assert.equal(detail.querySelector('.detailHeader').parentElement,detail);assert.equal(d.getElementById('detailBody').parentElement,scroll);
 w.DetailSheetResize.sync();assert.equal(detail.querySelectorAll('.detailScroll').length,1);
 const point=(target,type,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerType:'mouse',pointerId:1,isPrimary:true,button:0,clientX:60,clientY:y});target.dispatchEvent(e)};
 scroll.scrollTop=72;point(d.querySelector('h2'),'pointerdown',500);assert(w.DetailSheetResize.isInteracting());w.DetailSheetResize.deferRefresh();point(w,'pointermove',250);point(w,'pointerup',250);assert(!w.DetailSheetResize.isInteracting());assert.equal(refreshes,1,'deferred data refresh waits for release');assert.equal(scroll.scrollTop,72,'raising detail does not consume reading scroll');assert(parseFloat(side.style.getPropertyValue('--menu-height'))>350);
 dom.window.close();
}console.log('PASS nested detail desktop/mobile: fixed header, one scroll body, upward resize, preserved reading position and deferred refresh');})();
