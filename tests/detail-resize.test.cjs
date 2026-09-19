const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
for(const mobile of [true,false]){
 const dom=new JSDOM('<div class="mapwrap"><div id="detail" class="show"><div id="detailBody"></div></div></div>',{runScripts:'outside-only'});
 const w=dom.window,p=w.document.getElementById('detail'),map=w.document.querySelector('.mapwrap');
 let mapHeight=700;
 map.getBoundingClientRect=()=>({height:mapHeight,bottom:mapHeight});
 p.getBoundingClientRect=()=>({height:parseFloat(p.style.getPropertyValue('--sheet-height'))||220,bottom:mapHeight-24});
 w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id};
 w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id};
 w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null};
 vm.runInContext('let detailExpanded=false;let pans=0;function positionSelectedPlaceInView(){pans++}function syncDetailPanelLayout(){window.DetailSheetResize.sync()}',dom.getInternalVMContext());
 vm.runInContext(fs.readFileSync('assets/js/detail-resize.js','utf8'),dom.getInternalVMContext());
 w.DetailSheetResize.sync();const handle=p.firstElementChild;
 function pointer(type,y){const e=new w.Event(type,{cancelable:true});Object.assign(e,{pointerId:1,clientY:y,button:0,isPrimary:true,pointerType:mobile?'touch':'mouse'});handle.dispatchEvent(e)}
 pointer('pointerdown',500);pointer('pointermove',300);assert.equal(p.style.getPropertyValue('--sheet-height'),'420px');
 assert.equal(vm.runInContext('detailExpanded',dom.getInternalVMContext()),true);
 pointer('pointermove',-3000);assert.equal(p.style.getPropertyValue('--sheet-height'),'664px');
 pointer('pointerup',-3000);assert.equal(p.classList.contains('detailDragging'),false);
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',cancelable:true}));
 assert.equal(p.style.getPropertyValue('--sheet-height'),'180px');
 assert.equal(vm.runInContext('detailExpanded',dom.getInternalVMContext()),false);
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',cancelable:true}));
 mapHeight=350;w.dispatchEvent(new w.Event('resize'));assert.equal(p.style.getPropertyValue('--sheet-height'),'314px');
 pointer('pointerdown',200);pointer('pointermove',180);pointer('pointercancel',180);assert.equal(p.classList.contains('detailDragging'),false);
 w.DetailSheetResize.reset();assert.equal(p.style.getPropertyValue('--sheet-height'),'');assert.equal(p.classList.contains('detailResized'),false);
 dom.window.close();
}
console.log('PASS touch/mouse drag, height limits, keyboard, resize, cancel and reset');
