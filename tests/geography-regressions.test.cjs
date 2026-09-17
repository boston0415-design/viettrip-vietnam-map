const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console,assert,URL,Map,Set,Promise,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}});
ctx.window=ctx;
ctx.document={addEventListener(){},querySelector(){return {value:'',textContent:'',classList:{toggle(){},add(){},remove(){}}}},querySelectorAll(){return []}};
for(const file of fs.readdirSync(path.join(__dirname,'../assets/js')).filter(f=>f.endsWith('.js')&&!f.startsWith('09-')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8'),ctx,{filename:file});
const run=s=>vm.runInContext(s,ctx);
run(`
class TestCircle{constructor(options){this.options=options}addListener(){}setMap(map){this.removed=map===null}}
google={maps:{Circle:TestCircle}};
state.map={};setDbStatus=()=>{};
let checked=0;
for(const [city,data] of Object.entries(CITY_DATA)){
 for(const area of [...data.areas,...(EXTRA_DATA[city]?.zones||[])]){
  assert.ok(validMapLocation(area.center),area.name);
  assert.ok(geoDistanceMeters(area.center,data.center)<80000,area.name+' must be near its city');
  assert.ok(!area.path || area.geometryVerified,area.name+' must not ship an unverified road path');
  const marker=drawAreaReference(area);
  assert.ok(marker instanceof TestCircle,area.name+' needs a geographic range');
  assert.equal(marker.options.radius,areaRangeRadius(area));
  assert.equal(marker.options.strokeWeight,2);
  assert.equal(marker.options.fillOpacity,.12);
  checked++;
 }
 for(const point of [...(EXTRA_DATA[city]?.points||[]),...(data.golf||[])]){
  if(point.lat!=null || point.lng!=null)assert.ok(validMapLocation(point),point.name);
 }
 drawCityRange(city);
}
assert.equal(drawAreaReference({name:'invalid',center:{lat:null,lng:108}}),null);
assert.equal(explicitPlaceCityKey({lat:15.88,lng:108.33,address:'Hội An, Đà Nẵng, Vietnam'}),'hoian');
assert.equal(explicitPlaceCityKey({lat:16.05,lng:108.20,address:'Đà Nẵng',area:'호이안 인근'}),'danang');
assert.equal(isPreciseAddressResult({types:['locality','political']}),false);
assert.equal(isPreciseAddressResult({types:['route']}),false);
assert.equal(isPreciseAddressResult({types:['street_address'],partial_match:true}),false);
assert.equal(isPreciseAddressResult({types:['street_address']}),true);
assert.equal(isPreciseAddressResult({types:['establishment','point_of_interest']}),true);
// An old route may still arrive from a cache: never connect unverified coordinates.
const legacy=drawAreaReference({name:'legacy',center:{lat:10.95,lng:108.21},path:[{lat:0,lng:0},{lat:1,lng:1}]});
assert.equal(legacy.options.center.lat,10.95);
console.log('PASS visible geographic ranges and coordinate sanity:',checked,'areas across 9 cities');
console.log('PASS overlapping city names and imprecise address rejection');
let pointCases=0;
for(const extra of Object.values(EXTRA_DATA)){
 for(const point of extra.points||[]){
  const loc=validMapLocation(point);if(!loc)continue;
  const circle=addUnifiedPointRange(point.type,loc,point);
  assert.ok(circle instanceof TestCircle);
  assert.equal(circle.options.radius,pointCircleRadius(point.type,point));
  assert.equal(circle.options.strokeWeight,2);
  assert.equal(circle.options.fillOpacity,.12);
  pointCases++;
 }
}
for(const city of Object.values(CITY_DATA)){
 for(const golf of city.golf){
  const loc=validMapLocation(golf)||city.center;
  assert.equal(addGolfRangeRing(loc,golf).options.radius,700);
 }
}
assert.equal(businessCircleRadius('shopping'),pointCircleRadius('쇼핑'));
assert.equal(addSelectionCircle({lat:10,lng:108},0),null);
assert.equal(addSelectionCircle({lat:10,lng:108},NaN),null);
assert.equal(addSelectionCircle({lat:null,lng:108},100),null);
state.selectionOverlays=[];
const draw=()=>addSelectionCircle({lat:10,lng:108},500);
assert.equal(toggleSelectionRange('same',draw),true);
const old=state.selectionOverlays[0];
assert.equal(toggleSelectionRange('same',draw),true);
assert.equal(state.selectionOverlays.length,1);
assert.equal(old.removed,true);
assert.equal(state.selectionOverlays[0].options.radius,500);
console.log('PASS all',pointCases,'fixed POIs, every golf course, consistent style and repeated selection');
`);
(async()=>{
 await run(`(async()=>{
  let routeCases=0;
  makeBounds=()=>({points:[],extend(p){this.points.push(p)},isEmpty(){return !this.points.length}});
  fitUnifiedBounds=()=>{};fitCircleGeometry=()=>{};
  clearAreaLabels=()=>{};clearSelectedSystemIcons=()=>{};closeSystemInfo=()=>{};
  resetIndependentBusinessFilters=()=>{};renderAll=()=>{};
  createSelectedPoiMarker=()=>{};createGolfMarker=()=>{};
  items=()=>[];
  resolvePoiLocationPromise=async p=>validMapLocation(p)||currentCity().center;
  resolveGolfLocationPromise=async p=>validMapLocation(p)||currentCity().center;
  for(const city of Object.keys(CITY_DATA)){
   state.city=city;state.navCategory=null;state.selectedNavItem=null;
   for(const type of ['거리','시장','관광명소','한인생활권']){
    showTypeRanges(type);
    assert.equal(state.selectionOverlays.length,currentAreas().filter(a=>normalizeAreaType(a)===type).length,city+' '+type);
    routeCases++;
   }
   for(const type of ['공항','터미널','그랩승차','택시승차','전철역','기차역','병원']){
    const points=currentPoints().filter(p=>p.type===type);
    await showPointSet(points,type);
    assert.equal(state.selectionOverlays.length,points.length,city+' '+type);
    routeCases++;
   }
   await showShoppingCategory();
   assert.equal(state.selectionOverlays.length,currentPoints().filter(p=>p.type==='쇼핑').length,city+' shopping');
   await showGolfCategory();
   assert.equal(state.selectionOverlays.length,currentGolf().length,city+' golf');
   assert.ok(state.selectionOverlays.every(c=>c instanceof TestCircle));
   routeCases+=2;
  }
  console.log('PASS category render routes:',routeCases,'(address-only resolution stubbed)');
  let finish;let calls=0;
  setPlaceSaving=on=>state.placeSaveInProgress=on;
  savePlaceOnce=()=>{calls++;return new Promise(resolve=>finish=resolve)};
  const pending=savePlace();await savePlace();
  assert.equal(calls,1,'double click must not start a second upload/insert');
  finish();await pending;assert.equal(state.placeSaveInProgress,false);
  savePlaceOnce=async()=>{throw Error('upload failed')};
  await assert.rejects(savePlace(),/upload failed/);
  assert.equal(state.placeSaveInProgress,false,'failed save must release the lock');
  console.log('PASS save concurrency and failure recovery');
 })()`);
})().catch(err=>{console.error(err);process.exitCode=1});
