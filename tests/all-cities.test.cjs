// Actual filter DOM + map camera math, including the production runtime scope guard.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
let width=390,height=650,clock=0,frames=[];
w.assert=assert;w.matchMedia=q=>({matches:q.includes('max-width')?width<=900:width>900});
w.setTimeout=()=>0;w.setInterval=()=>0;w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};w.performance.now=()=>clock;
w.flushFrames=()=>{let n=0;while(frames.length){assert(++n<100);clock+=40;const queue=frames;frames=[];queue.forEach(fn=>fn(clock))}};
w.setViewport=(x,y)=>{width=x;height=y};
const map=w.document.querySelector('#map');
Object.defineProperties(map,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
map.getBoundingClientRect=()=>({top:0,left:0,right:width,bottom:height,width,height});
w.document.querySelector('#areaLegend').getBoundingClientRect=()=>{
 const h=w.document.querySelector('#areaLegend').classList.contains('mobileCollapsed')?46:Math.min(440,height-80);
 return {left:10,right:width-10,top:height-24-h,bottom:height-24,width:width-20,height:h};
};
(async()=>{
 try{
  for(const m of read('index.html').matchAll(/<script src="\.\/(assets\/js\/(?:0[1-8]-[^?]+|10-runtime-guard\.js|(?:hospital|pharmacy)-directory\.js))\?/g))run(read(m[1]));
  await run(`(async()=>{
   class Bounds{
    constructor(){this.points=[]}extend(p){this.points.push(p);return this}isEmpty(){return !this.points.length}
    getNorthEast(){return {lat:()=>Math.max(...this.points.map(p=>p.lat)),lng:()=>Math.max(...this.points.map(p=>p.lng))}}
    getSouthWest(){return {lat:()=>Math.min(...this.points.map(p=>p.lat)),lng:()=>Math.min(...this.points.map(p=>p.lng))}}
    getCenter(){const ne=this.getNorthEast(),sw=this.getSouthWest();return {lat:()=>(ne.lat()+sw.lat())/2,lng:()=>(ne.lng()+sw.lng())/2}}
   }
   class Shape{constructor(o){this.options=o;this.events={}}setMap(m){this.map=m}setOptions(o){Object.assign(this.options,o)}addListener(e,f){this.events[e]=f}}
   google={maps:{Circle:Shape,Marker:Shape,LatLngBounds:Bounds,Size:class{},Point:class{}}};
   let center={lat:10.77,lng:106.7},zoom=12;
   state.map={getDiv:()=>$('#map'),getCenter:()=>({lat:()=>center.lat,lng:()=>center.lng}),getZoom:()=>zoom,setCenter:p=>{center=p},setZoom:z=>{zoom=z}};
   bindMapFeatureInfo=()=>{};initAddressAutocomplete=()=>{};
   let fixture={places:Object.entries(CITY_DATA).map(([city,c],i)=>({id:city,name:'전국 업체 '+city,category:i%2?'restaurant':'barber',subcategory:i%2?'한식':'이발소',area:c.label,address:c.label,initialRating:i%2?4:5,memberBenefit:i%3===0,...c.center})),reviews:[]};
   fixture.places.push({id:'hue',name:'전국 업체 후에',category:'barber',subcategory:'이발소',lat:16.46,lng:107.59,initialRating:5});
   fixture.places.push({id:'no-position',name:'좌표 미확인 업체',category:'cafe',subcategory:'카페'});
   db=()=>fixture;saveDb=data=>{fixture=data};state.sharedDbLoading=false;
   assert.equal(placeCityKey(fixture.places.find(p=>p.id==='hue')),null,'runtime guard still leaves unsupported cities unassigned');
   const expected=()=>items().filter(validMapLocation).map(p=>p.id).sort();
   function assertView(){
    assert.deepEqual(state.markers.map(m=>m._placeId).sort(),expected(),'map and list share the same scope');
    assert.equal($('#list').querySelectorAll('[data-id]').length,items().length);
    const scale=256*2**zoom,legend=$('#areaLegend').getBoundingClientRect(),width=$('#map').clientWidth,height=$('#map').clientHeight;
    for(const p of items().filter(validMapLocation)){
     const x=width/2+(p.lng-center.lng)/360*scale,y=height/2+(mercatorY(p.lat)-mercatorY(center.lat))*scale;
     assert(x>=0&&x<=width,'all markers fit horizontally');assert(y>=0&&y<=legend.top,'all markers fit above filters');
    }
   }
   for(const viewport of [[1280,800],[390,650],[360,480],[844,240]]){
    setViewport(...viewport);state.city='hcmc';renderCityControls();
    assert.equal($('#cityChips [data-city]').dataset.city,'all');$('#cityChips [data-city="all"]').click();flushFrames();
    assert.equal(state.city,'all');assert.equal(items().length,11);assert.equal(currentCity().label,'전체');
    assert($('#cityChips [data-city="all"]').classList.contains('active'));assert.equal($('#cityChips [data-city="all"]').getAttribute('aria-pressed'),'true');
    assert($('#cityInfoTools').hidden);assert.equal(currentPoints().length,0);assert.equal(currentAreas().length,0);
    assert(!$('#quickAreas [data-nav-cat="street"]'));assert($('#quickAreas [data-nav-cat="hospital"]'));
    assert(mapFilterSummary().includes('등록 업소'));assertView();
    $('#quickAreas [data-nav-cat="barber"]').click();flushFrames();assert.equal(items().length,6);assertView();
    state.ratingFilter='4.5';state.benefitFilter='benefit';renderAll();fitSelectedCityView('all');flushFrames();
    assert(items().every(p=>p.category==='barber'&&p.memberBenefit&&p.rating>=4.5));assertView();
    $('#cityChips [data-city="all"]').click();flushFrames();$('#searchInput').value='전국 업체';searchMap();flushFrames();
    assert.equal(state.city,'all');assert.equal(items().length,10);assertView();
    $('#searchInput').value='';searchMap();flushFrames();assert.equal(items().length,11);assertView();
    $('#cityChips [data-city="hcmc"]').click();flushFrames();assert.deepEqual(items().map(p=>p.id),['hcmc']);
    assert(!$('#cityInfoTools').hidden);assert($('#quickAreas [data-nav-cat="street"]'));
   }
   const original=fixture;
   for(const [nav,category] of Object.entries({hospital:'hospital',pharmacy:'pharmacy',shopping:'shopping','market-nav':'market','attraction-nav':'attraction','golf-nav':'golf'})){
    fixture={places:['hcmc','hanoi'].map(city=>({id:city,name:city+' '+category,category,subcategory:CONFIG.categories[category].subs[0],area:CITY_DATA[city].label,...CITY_DATA[city].center})),reviews:[]};
    switchCity('all');flushFrames();$('#quickAreas [data-nav-cat="'+nav+'"]').click();await Promise.resolve();await Promise.resolve();flushFrames();
    assert.equal(items().length,2,nav+' includes both cities');assertView();
   }
   fixture=original;
   switchCity('all');flushFrames();openPlace({name:'신규 업체',latLng:{lat:10.78,lng:106.71}});assert.equal($('#pArea').value,'호치민');
   openPlace({addressMode:true});assert.equal($('#pArea').value,'','all is never stored as an area');
   openPlace({name:'신규 업체',category:'barber',subcategory:'이발소',address:'Ho Chi Minh City',latLng:{lat:10.78,lng:106.71}});
   $('#pNickname').value='테스트 회원';uploadSelectedPlacePhotos=async()=>[];supaInsert=async()=>{};fetchSharedDb=async()=>fixture;
   focusLocationAtZoom=async()=>{};await savePlaceOnce();assert.equal(state.city,'all');assert.equal(fixture.places.at(-1).cityKey,'hcmc');
   fixture={places:[],reviews:[]};switchCity('all');flushFrames();assert.equal(items().length,0);assert.equal(state.markers.length,0);assert(Number.isFinite(zoom));
  })()`);
  console.log('PASS all-city list/markers, unassigned cities, 4 viewport camera fits, city/category/rating/benefit/search switches, registration scope and empty results with runtime guard');
 }finally{dom.window.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
