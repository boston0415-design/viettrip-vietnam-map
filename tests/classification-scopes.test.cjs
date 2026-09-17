const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context=vm.createContext({console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise});
context.window=context;
context.document={addEventListener(){},querySelector(){return {value:'',textContent:'',classList:{toggle(){},add(){},remove(){}},innerHTML:''}},querySelectorAll(){return []}};
const files=fs.readdirSync(path.join(__dirname,'../assets/js')).filter(f=>f.endsWith('.js')&&!f.startsWith('09-')).sort();
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8'),context,{filename:file});
const run=code=>vm.runInContext(code,context);
context.assert=assert;
run(`
let fixtures=[];
db=()=>({places:fixtures,reviews:[]});
stats=()=>({rating:4.5,count:1});
setDbStatus=()=>{};
renderCats=()=>{};renderList=()=>{};renderMarkers=()=>{};renderDetail=()=>{};
renderHierarchyNav=()=>{};clearAreaLabels=()=>{};hideHover=()=>{};
makeBounds=()=>({points:[],extend(p){this.points.push(p)},isEmpty(){return !this.points.length}});
extendBoundsByCircle=(bounds,loc,radius)=>bounds.extend({...loc,radius});
let lastBounds=null;
fitUnifiedBounds=b=>{lastBounds=b};
addSelectionCircle=(center,radius)=>{
  const o={center,radius,setMap(m){this.removed=m===null}};
  state.selectionOverlays.push(o);return o;
};
addSelectionPath=()=>{};
createGolfMarker=()=>{};addGolfRangeRing=()=>{};
createSelectedPoiMarker=()=>{};addUnifiedPointRange=()=>{};
state.map={};state.sharedDbLoading=false;
function reset(city='hcmc'){
 Object.assign(state,{city,navCategory:null,selectedNavItem:null,cat:'all',sub:'all',restaurantTag:'all',ratingFilter:'all',benefitFilter:'all',query:'',rangeSelectionKey:null,selectionOverlays:[],golfMarkers:[],poiMarkers:[]});
 fixtures=[];lastBounds=null;
}
function fixture(category,id,city=state.city,sub=CONFIG.categories[category].subs[0]){
 return {id,name:id,category,subcategory:sub,...CITY_DATA[city].center};
}

// Every city and every navigable category uses the same business scope.
let cases=0;
for(const city of Object.keys(CITY_DATA)){
 for(const def of NAV_CATEGORIES){
  reset(city);
  fixtures=Object.keys(CONFIG.categories).map(cat=>fixture(cat,cat));
  fixtures.push(fixture('restaurant','other-city',city==='hcmc'?'hanoi':'hcmc'));
  state.navCategory=def.id;
  state.cat=def.kind==='business'?def.id:def.kind==='shopping'?'shopping':'all';
  const expected=def.kind==='business'?def.id:({shopping:'shopping','market-nav':'market','attraction-nav':'attraction','golf-nav':'golf'})[def.id];
  const result=items();
  assert.equal(result.length,expected?1:0,city+' '+def.id);
  if(expected)assert.equal(result[0].category,expected);
  cases++;
 }
}
// All configured business subcategories isolate exactly one fixture.
for(const [cat,cfg] of Object.entries(CONFIG.categories)){
 for(const sub of cfg.subs){
  reset();fixtures=cfg.subs.map(s=>fixture(cat,s,'hcmc',s));
  focusBusinessCategory(cat,sub);
  assert.equal(items().length,1,cat+' '+sub);
  assert.equal(state.selectionOverlays.length,1,'one range per matching business');
  assert.equal(lastBounds.points.length,1);
  cases++;
 }
}
reset();
fixtures=[fixture('market','market'),fixture('restaurant','restaurant')];
state.navCategory='market-nav';state.rangeSelectionKey='type:hcmc:시장';
refreshRegisteredCoverage();refreshRegisteredCoverage();
assert.equal(state.selectionOverlays.length,1,'repeated data refresh cannot duplicate coverage');
state.navCategory='airport';refreshRegisteredCoverage();
assert.equal(items().length,0);assert.equal(state.selectionOverlays.length,0);
state.navCategory='market-nav';state.selectedNavItem='some other market';
assert.equal(items().length,0,'named selection cannot include all businesses in its parent');
assert.equal(validMapLocation({lat:null,lng:106}),null);
assert.equal(validMapLocation({lat:'',lng:106}),null);
assert.equal(validMapLocation({lat:91,lng:106}),null);
assert.equal(validMapLocation({lat:10,lng:181}),null);
assert.equal(nearestCityKeyForLatLng(null,106),null);
assert.equal(placeCityKey({lat:35,lng:139}),null,'remote coordinates cannot enter supported cities');
assert.equal(placeCityKey({lat:null,lng:null,address:'Ho Chi Minh City'}),'hcmc','address-only record stays in list');

// A category with no static areas must still fit registered businesses.
reset('hoian');state.navCategory='market-nav';fixtures=[fixture('market','only market')];
const originalAreas=currentAreas;currentAreas=()=>[];
showTypeRanges('시장');
assert.equal(lastBounds.points.length,1);assert.equal(state.selectionOverlays.length,1);
currentAreas=originalAreas;

// Data refresh and sort must preserve the selected system icons.
state.golfMarkers=[{setMap(){throw Error('selected golf marker removed')}}];
state.poiMarkers=[{setMap(){throw Error('selected point marker removed')}}];
renderAll();
console.log('PASS city/category and subcategory cases:',cases);
`);
(async()=>{
 await run(`(async()=>{
  reset();state.navCategory='golf-nav';fixtures=[fixture('golf','registered only')];
  const originalGolf=currentGolf;currentGolf=()=>[];
  await showGolfCategory();
  assert.equal(lastBounds.points.length,1);assert.equal(state.selectionOverlays.length,1);
  currentGolf=()=>[{name:'pending course'}];
  let finish;
  resolveGolfLocationPromise=()=>new Promise(resolve=>{finish=resolve});
  const pending=showGolfCategory();
  cancelPendingMapWork();state.navCategory='airport';clearSelectionRanges();
  finish({lat:10.8,lng:106.7});await pending;
  assert.equal(state.selectionOverlays.length,0,'cancelled golf work cannot add coverage to airport');
  currentGolf=originalGolf;
  console.log('PASS registered-only golf and asynchronous navigation cancellation');
 })()`);
})().catch(e=>{console.error(e);process.exitCode=1});
