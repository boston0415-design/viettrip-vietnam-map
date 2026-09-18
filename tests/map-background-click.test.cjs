const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const root=path.join(__dirname,'../assets/js');
const source=fs.readFileSync(process.env.MAP_EVENTS_SOURCE||path.join(root,'09-init-events.js'),'utf8');
const start=source.indexOf("state.map.addListener('click',e=>{");
const end=source.indexOf('\n  renderPopularAreas();',start);
assert(start>=0&&end>start,'capture the real map click listener');

const context=vm.createContext({console,assert,Map,Set,URL,queueMicrotask:()=>{},setTimeout:()=>0,clearTimeout(){},setInterval(){},clearInterval(){}});
context.window=context;
const classes=new Set(['mobileCollapsed']),attributes={};
const legend={classList:{remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k)}}};
const filterLabel={textContent:''};
const title={classList:{remove(){}},setAttribute:(k,v)=>attributes[k]=v,querySelector:()=>filterLabel,focus(){}};
const body={hidden:true,contains:()=>false};
const nodes={'#areaLegend':legend,'#areaLegendTitle':title,'#areaLegendBody':body,'#activeCityName':{},'#filterSelectionSummary':{}};
context.document={addEventListener(){},querySelector:s=>nodes[s]||{classList:{remove(){}}},querySelectorAll(){return []}};
for(const file of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort()){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}
const run=code=>vm.runInContext(code,context);
run(`
let click;
let detailCloses=0,areaCloses=0,registrationEvent=null,poiEvent=null;
state.map={addListener:(name,handler)=>{assert.equal(name,'click');click=handler}};
renderList=()=>{};refreshMapAfterMobileLayout=()=>{};
closeAreaPanel=()=>{areaCloses++};
const originalCloseDetail=closeDetailPanel;
closeDetailPanel=()=>{detailCloses++;originalCloseDetail()};
registerMapClick=e=>{registrationEvent=e};
handleGooglePoiClick=e=>{poiEvent=e};
function overlay(){return {map:state.map,setMap(map){this.map=map}}}
const marker=overlay(),golf=overlay(),range=overlay();
state.poiMarkers=[marker];state.golfMarkers=[golf];state.selectionOverlays=[range];
Object.assign(state,{city:'hcmc',cat:'all',navCategory:'공항',selectedNavItem:'Grab T3',rangeSelectionKey:'airport:hcmc',ratingFilter:'all',benefitFilter:'all',selected:'business'});
const selection=()=>JSON.stringify([state.city,state.cat,state.navCategory,state.selectedNavItem,state.rangeSelectionKey,state.ratingFilter,state.benefitFilter]);
const before=selection();
`);
run(source.slice(start,end));
run(`
// Repeated background taps must dismiss information without removing map layers.
for(let i=0;i<3;i++){
 let closed=0;state.clickInfo={close(){closed++}};
 click({latLng:{lat:10.8,lng:106.7}});
 assert.equal(closed,1);assert.equal(state.clickInfo,null);
 assert.equal(state.selected,null);
 assert.equal(marker.map,state.map,'airport/taxi marker remains visible');
 assert.equal(golf.map,state.map,'golf marker remains visible');
 assert.equal(range.map,state.map,'selected range remains visible');
 assert.equal(state.poiMarkers.length,1);assert.equal(state.golfMarkers.length,1);
 assert.equal(state.selectionOverlays.length,1);
 assert.equal(selection(),before,'filters and range selection remain active');
}
assert.equal(detailCloses,3);assert.equal(areaCloses,3);
// Registration and Google POI clicks must keep their existing handlers.
state.registerMode=true;
const registration={latLng:{lat:10,lng:106}};click(registration);
assert.equal(registrationEvent,registration);assert.equal(detailCloses,3);
state.registerMode=false;
let stopped=0;
const poi={placeId:'google-place',latLng:{lat:10,lng:106},stop(){stopped++}};click(poi);
assert.equal(poiEvent,poi);assert.equal(stopped,1);assert.equal(detailCloses,3);
let picked=null;window.NearbyBusinesses={handleMapClick:e=>{picked=e;return true}};
const manual={latLng:{lat:10,lng:106},placeId:'manual-poi'};click(manual);assert.equal(picked,manual);assert.equal(poiEvent,poi,'manual selection bypasses Google detail requests');
console.log('PASS background taps preserve icons, ranges and filters; cards dismiss; registration and Google POI clicks remain intact');
`);
