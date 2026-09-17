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
class TestMarker{constructor(options){this.options=options}addListener(){}setMap(){}}
google={maps:{Marker:TestMarker,SymbolPath:{CIRCLE:'circle'}}};
state.map={};setDbStatus=()=>{};
let checked=0;
for(const [city,data] of Object.entries(CITY_DATA)){
 for(const area of [...data.areas,...(EXTRA_DATA[city]?.zones||[])]){
  assert.ok(validMapLocation(area.center),area.name);
  assert.ok(geoDistanceMeters(area.center,data.center)<80000,area.name+' must be near its city');
  assert.ok(!area.path || area.geometryVerified,area.name+' must not ship an unverified road path');
  const marker=drawAreaReference(area);
  assert.equal(marker.options.title,area.name+' · 참고 위치');
  checked++;
 }
 for(const point of [...(EXTRA_DATA[city]?.points||[]),...(data.golf||[])]){
  if(point.lat!=null || point.lng!=null)assert.ok(validMapLocation(point),point.name);
 }
 drawCityRange(city); // A fabricated city boundary would require an unstubbed Circle constructor.
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
assert.equal(legacy.options.position.lat,10.95);
console.log('PASS reference geometry and coordinate sanity:',checked,'areas across 9 cities');
console.log('PASS overlapping city names and imprecise address rejection');
`);
(async()=>{
 await run(`(async()=>{
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
