const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const nodes=new Map(),listeners={};
const document={activeElement:null,querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn};
function element(id){
 const classes=new Set(),attrs={},handlers={};
 const el={id,hidden:false,textContent:'',attrs,handlers,
  classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){on??=!classes.has(k);on?classes.add(k):classes.delete(k);return on}},
  setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k]??null,
  addEventListener:(type,fn)=>handlers[type]=fn,focus(){document.activeElement=this},
  querySelector:()=>nodes.get('.filterToggleLabel'),contains:el=>el?.insideFilters===true};
 nodes.set('#'+id,el);return el;
}
for(const id of ['areaLegend','areaLegendTitle','areaLegendBody','activeCityName','filterSelectionSummary','closeMapFilters','openAreaDirectory','areaPanel','areaPanelClose','mobileListBtn','mobileListClose','businessSide'])element(id);
nodes.set('.filterToggleLabel',{textContent:''});nodes.set('.mapwrap',element('mapwrap'));
const ctx=vm.createContext({console,assert,document,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise,requestAnimationFrame:fn=>fn()});
ctx.window=ctx;ctx.matchMedia=()=>({matches:false});ctx.addEventListener=(type,fn)=>listeners[type]=fn;
for(const f of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const run=code=>vm.runInContext(code,ctx);
run(`
renderCityControls=()=>{};renderAreaList=()=>{};syncMobileListCount=()=>{};refreshMapAfterMobileLayout=()=>{};
Object.assign(state,{city:'hcmc',navCategory:'karaoke',cat:'karaoke',sub:'로컬 KTV',selectedNavItem:'로컬 KTV',ratingFilter:'4',benefitFilter:'benefit',query:'',restaurantTag:'all',rangeSelectionKey:'business:hcmc:karaoke'});
const fixtureMarker={setMap(){throw Error('filter menu must not remove markers')}};
state.markers=[fixtureMarker];state.selectionOverlays=[fixtureMarker];
const before=JSON.stringify(state);
bindAreaNavigation();
assert.equal(JSON.stringify(state),before);
assert.equal(mapFilterSummary().join(' · '),'호치민 · 가라오케 · 로컬 KTV · 4★ · 혜택업소');
`);
const title=nodes.get('#areaLegendTitle'),body=nodes.get('#areaLegendBody'),legend=nodes.get('#areaLegend');
assert.equal(body.hidden,true);assert.equal(title.attrs['aria-expanded'],'false');
for(let i=0;i<3;i++){
 title.handlers.click();assert.equal(body.hidden,false);assert.equal(title.attrs['aria-expanded'],'true');
 document.activeElement={insideFilters:true};nodes.get('#closeMapFilters').handlers.click();
 assert.equal(body.hidden,true);assert.equal(document.activeElement,title);assert.equal(title.attrs['aria-expanded'],'false');
 run('assert.equal(JSON.stringify(state),before)');
}
title.handlers.click();nodes.get('#openAreaDirectory').handlers.click();
assert.equal(body.hidden,true);assert.equal(nodes.get('#areaPanel').classList.contains('show'),true);
nodes.get('#areaPanelClose').handlers.click();assert.equal(document.activeElement,title);
const events=fs.readFileSync(path.join(root,'09-init-events.js'),'utf8');
const start=events.indexOf("window.addEventListener('resize',()=>{");
const end=events.indexOf("$('#mapRetryBtn')",start);
run(events.slice(start,end));
run('closeTopModalOrRegisterMode=()=>false');
for(const mobile of [false,true]){
 ctx.matchMedia=()=>({matches:mobile});
 for(const expanded of [false,true]){
  run(`setMobileLegendExpanded(${expanded})`);listeners.resize();
  assert.equal(body.hidden,!expanded,'resizing preserves menu state');
  run('assert.equal(JSON.stringify(state),before)');
 }
}
let prevented=0;
listeners.keydown({key:'Escape',preventDefault(){prevented++},stopPropagation(){}});
assert.equal(body.hidden,true);assert.equal(prevented,1);assert.equal(document.activeElement,title);
run(`
assert.equal(JSON.stringify(state),before);
Object.assign(state,{navCategory:'airport',cat:'all',sub:'all',selectedNavItem:'green',ratingFilter:'all',benefitFilter:'all'});
assert.equal(mapFilterSummary().join(' · '),'호치민 · 공항 · Green SM');
Object.assign(state,{navCategory:null,cat:'all',selectedNavItem:null});
assert.equal(mapFilterSummary().join(' · '),'호치민 · 전체');
`);
console.log('PASS compact filter defaults, selected summary, repeated open/close, focus, region directory, resize, Escape, and preserved filters/markers/ranges');
