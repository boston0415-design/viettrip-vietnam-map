const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const ctx=vm.createContext({console,assert,URL,Map,Set,Promise,setTimeout:()=>0,clearTimeout(){},setInterval(){},clearInterval(){}});
ctx.window=ctx;
ctx.document={addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(){},addEventListener(){},remove(){}})};
for(const file of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const run=code=>vm.runInContext(code,ctx);
run(`
class Shape{
 constructor(options){this.options={...options};this.map=options.map;this.events={};this.changes=[]}
 setOptions(options){this.changes.push({...options});Object.assign(this.options,options)}
 setMap(map){this.map=map}
 addListener(type,fn){this.events[type]=fn}
}
class Overlay{
 setMap(map){this.map=map;if(map){this.onAdd();this.draw()}else this.onRemove()}
 getPanes(){return {overlayMouseTarget:{appendChild(){}}}}
 getProjection(){return {fromLatLngToDivPixel:()=>({x:200,y:150})}}
}
google={maps:{Circle:Shape,Polyline:Shape,OverlayView:Overlay,LatLng:class{constructor(p){Object.assign(this,p)}},LatLngBounds:class{
 constructor(){this.points=[]}extend(p){this.points.push(p)}getCenter(){const p=this.points[0];return {lat:()=>p.lat,lng:()=>p.lng}}
}}};
let zoom=12,hoverCloses=0,infoCloses=0,desktop=true;
const listeners={};
state.map={getZoom:()=>zoom,addListener:(event,handler)=>{listeners[event]=handler}};
hideHover=()=>hoverCloses++;closeSystemInfo=()=>infoCloses++;supportsMapHover=()=>desktop;
const untouched={setMap(){throw Error('Zoom must not remove business/transport/location markers')},setOptions(){throw Error('Zoom must not restyle location accuracy')}};
Object.assign(state,{city:'hcmc',cat:'spa',sub:'발마사지',navCategory:'spa',selectedNavItem:'발마사지',ratingFilter:'4',benefitFilter:'benefit',query:'검색',selected:'business-a',rangeSelectionKey:'business:hcmc:spa',markers:[untouched],poiMarkers:[untouched],golfMarkers:[untouched],userAccuracyCircle:untouched});
const selection=()=>JSON.stringify([state.city,state.cat,state.sub,state.navCategory,state.selectedNavItem,state.ratingFilter,state.benefitFilter,state.query,state.selected,state.rangeSelectionKey]);
const before=selection();
const business=addSelectionCircle({lat:10.77,lng:106.7},150,'#ec4899',.065,.68,{name:'마사지'});
const airport=addUnifiedPointRange('공항',{lat:10.81,lng:106.66},{name:'떤선녓 국제공항'});
const line=addSelectionPath([{lat:10.77,lng:106.7},{lat:10.78,lng:106.71}]);
const label=makeAreaLabel({lat:10.77,lng:106.7},'지역 범위',{name:'지역',radius:300});
state.areaLabels.push(label);
assert.equal(business.options.fillOpacity,.065);assert.equal(airport.options.radius,1650);
assert.equal(label.div.style.display,'');
`);
// Execute the production gesture/zoom handler, including hover cleanup.
const source=fs.readFileSync(path.join(root,'09-init-events.js'),'utf8');
const start=source.indexOf("for(const event of ['dragstart','zoom_changed'])");
const end=source.indexOf('  initAddressAutocomplete();',start);
assert(start>=0 && end>start);
run(source.slice(start,end));
run(`
for(const isDesktop of [true,false]){
 desktop=isDesktop;
 for(const z of [12,15,15.5,16,16.5,17,18,20,16,14]){
  zoom=z;listeners.zoom_changed();
  const visible=z<17,outline=Math.max(0,Math.min(1,(17-z)/2)),fill=Math.max(0,Math.min(1,16-z));
  for(const [shape,baseFill,baseStroke] of [[business,.065,.68],[airport,.08,.7],[line,undefined,.5]]){
   assert.equal(shape.options.visible,visible);assert.equal(shape.options.clickable,visible);
   assert.equal(shape.options.strokeOpacity,baseStroke*outline);
   if(baseFill!==undefined)assert.equal(shape.options.fillOpacity,baseFill*fill);
   assert.equal(shape.map,state.map,'visibility must not detach or recreate ranges');
  }
  assert.equal(label.div.style.display,visible?'':'none');assert.equal(Number(label.div.style.opacity),outline);
  assert.equal(business.options.radius,150);assert.equal(airport.options.radius,1650);
  assert.equal(selection(),before);assert.equal(state.markers[0],untouched);
 }
}
assert.equal(hoverCloses,20);assert.equal(infoCloses,10,'only mobile closes click cards during zoom, as before');
assert.equal(business.options.fillOpacity,.065,'zooming back out restores original opacity exactly');
assert.equal(business.options.strokeOpacity,.68);
assert.equal(state.selectionOverlays.length,3);
for(const shape of state.selectionOverlays){
 assert(shape.changes.every(change=>Object.keys(change).every(key=>['visible','clickable','fillOpacity','strokeOpacity'].includes(key))),'only visibility/opacity may change');
}
// Data/filter refresh at street zoom must create hidden ranges immediately.
zoom=17;
items=()=>[{id:'a',name:'회원 업소',category:'spa',lat:10.77,lng:106.7}];
refreshRegisteredCoverage();
const refreshed=state.selectionOverlays.find(o=>o._registeredCoverage);
assert(refreshed);assert.equal(refreshed.options.visible,false);assert.equal(refreshed.options.clickable,false);
assert.equal(refreshed.options.fillOpacity,0);assert.equal(refreshed.options.radius,150);
const closeLabel=makeAreaLabel({lat:10.77,lng:106.7},'확대 후 선택');state.areaLabels.push(closeLabel);
assert.equal(closeLabel.div.style.display,'none','late-created labels must start hidden too');
zoom=13;listeners.zoom_changed();assert(refreshed.options.visible);assert.equal(closeLabel.div.style.display,'');
// Clearing a selection and zooming out must not resurrect old layers.
clearSelectionRanges();clearAreaLabels();zoom=12;listeners.zoom_changed();
assert.equal(state.selectionOverlays.length,0);assert.equal(state.areaLabels.length,0);assert.equal(refreshed.map,null);assert.equal(closeLabel.div,null);
assert.equal(referenceRangeZoomStyle({fillOpacity:.08,strokeOpacity:.7},undefined).fillOpacity,.08);
console.log('PASS desktop/mobile zoom fade, street-level hiding, click-through, labels, restoration, late data refresh, unchanged geometry/filters/markers, and no layer resurrection');
`);
