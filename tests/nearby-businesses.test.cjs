const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 for(const mobile of [false,true]){
  const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
  const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.assert=assert;w.matchMedia=q=>({matches:q.includes('max-width')?mobile:!mobile});
  w.localStorage.setItem('viettrip_nearby_stay_v1',JSON.stringify({name:'이전에 지정한 숙소',address:'기억한 주소',lat:10.77,lng:106.7,expiresAt:Date.now()+(mobile?-1000:86400000)}));
  let timerId=0;const timers=new Map();
  w.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId};w.clearTimeout=id=>timers.delete(id);
  w.firePositionDeadline=()=>{const found=[...timers].find(([,t])=>t.delay===10000);assert(found,'position deadline exists');timers.delete(found[0]);found[1].fn()};w.setInterval=()=>0;w.requestAnimationFrame=()=>0;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
  try{
   for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+name));
   run(read('assets/js/10-runtime-guard.js'));run(read('assets/js/personal-places.js'));
   run(`
    class Bounds{constructor(){this.points=[]}extend(p){this.points.push(p);return this}isEmpty(){return !this.points.length}}
    class Shape{constructor(o){this.options=o;this.map=o.map;this.events={}}setMap(m){this.map=m}getMap(){return this.map}setOptions(o){Object.assign(this.options,o)}addListener(e,f){this.events[e]=f}}
    let searches=[],geoRequests=[],lastBounds=null;const realSmoothFitBounds=smoothFitBounds;
    google={maps:{Circle:Shape,Marker:Shape,LatLngBounds:Bounds,Size:class{},Point:class{},places:{PlacesService:class{findPlaceFromQuery(request,callback){searches.push({request,callback})}}}}};
    navigator.geolocation={getCurrentPosition:(success,error,options)=>geoRequests.push({success,error,options})};
    state.map={};bindMapFeatureInfo=()=>{};initAddressAutocomplete=()=>{};smoothFitBounds=bounds=>{lastBounds=bounds};refreshMapAfterMobileLayout=()=>{};
    const origin={lat:10.77,lng:106.7};
    const fixture={places:[
     {id:'stay',name:'테스트 숙소',category:'stay',subcategory:'호텔',address:'호치민 테스트 주소',...origin},
     {id:'near',name:'가까운 식당',category:'restaurant',subcategory:'한식',lat:10.771,lng:106.7,initialRating:5,memberBenefit:true},
     {id:'middle',name:'중간 식당',category:'restaurant',subcategory:'베트남',lat:10.776,lng:106.7,initialRating:3},
     {id:'far',name:'먼 식당',category:'restaurant',subcategory:'한식',lat:10.791,lng:106.7,initialRating:5},
     {id:'pharmacy',name:'가까운 약국',category:'pharmacy',subcategory:'약국',lat:10.772,lng:106.7},
     {id:'invalid',name:'위치 없는 식당',category:'restaurant',subcategory:'한식'},
     {id:'hanoi',name:'하노이 식당',category:'restaurant',subcategory:'한식',lat:21.03,lng:105.85}
    ],reviews:[]};db=()=>fixture;state.sharedDbLoading=false;
   `);
   run(read('assets/js/nearby-businesses.js'));
   run(`
    const nearby=window.NearbyBusinesses,ids=()=>items().map(p=>p.id);
    const assertMapList=()=>{assert.deepEqual(state.markers.map(m=>m._placeId).sort(),ids().slice().sort());assert.equal($('#list').querySelectorAll('[data-id]').length,items().length)};
    $('#nearbyStay').click();assert.equal($('#nearbySavedStay').hidden,${mobile});if(!${mobile})assert.equal($('#nearbySavedName').textContent,'이전에 지정한 숙소');$('#nearbyStayClose').click();
    // Selecting a registered stay never contacts Google and retains the chosen category.
    state.cat='restaurant';state.navCategory='restaurant';state.sub='all';renderCityControls();
    $('#nearbyStay').click();assert($('#nearbyStayDialog').open);assert.equal(searches.length,0);
    $('#nearbyStayResults button').click();
    assert(!$('#nearbyStayDialog').open);assert(nearby.active());assert.equal(state.cat,'restaurant');assert.equal(state.city,'all');assert.equal(state.sort,'distance');
    assert.deepEqual(ids(),['near','middle']);assertMapList();assert($('#list').textContent.includes('직선 111m'));
    assert.equal($('#activeCityName').textContent,'주변');assert.equal($('#nearbySelection').hidden,false);
    assert(lastBounds.points.some(p=>p.lat>origin.lat)&&lastBounds.points.some(p=>p.lat<origin.lat),'camera fits both sides of search circle');
    assert(!$('#nearbyDistanceSort').disabled);const stored=localStorage.getItem('viettrip_nearby_stay_v1');assert(stored.includes('테스트 숙소'));
    $('#nearbyRadius').value='500';$('#nearbyRadius').dispatchEvent(new Event('change'));assert.deepEqual(ids(),['near']);assertMapList();
    nearby.setRadius(3000);assert.deepEqual(ids(),['near','middle','far']);assert.equal(searches.length,0);
    const radius=state.nearby.radius;nearby.setRadius(-1);assert.equal(state.nearby.radius,radius);
    state.ratingFilter='4.5';state.benefitFilter='benefit';renderAll();assert.deepEqual(ids(),['near']);
    $('#quickAreas [data-nearby-category="pharmacy"]').click();assert.equal(state.nearby.radius,3000);assert.equal(items().length,0,'rating and benefit filters still apply');
    state.ratingFilter='all';state.benefitFilter='all';renderAll();assert.deepEqual(ids(),['pharmacy']);assertMapList();
    $('#quickAreas [data-nearby-category="restaurant"]').click();$('#subNav [data-nearby-sub="한식"]').click();assert.deepEqual(ids(),['near','far']);
    $('#searchInput').value='하노이';searchMap();assert.equal(items().length,0);assert($('#list').textContent.includes('반경'));assert.equal(searches.length,0,'nearby keyword searches never call Google');
    $('#searchInput').value='';searchMap();assert.deepEqual(ids(),['near','far']);assert.equal(state.sub,'한식');
    window.PersonalPlaces.toggleHidden('near');renderAll();assert.deepEqual(ids(),['far']);window.PersonalPlaces.setView('hidden');renderList();assert.equal(items({forList:true})[0].id,'near');assert.equal(items().length,0);
    window.PersonalPlaces.setView('all');window.PersonalPlaces.toggleHidden('near');renderAll();
    // Current location never overwrites a remembered stay; permission errors retain the old scope.
    $('#nearbyCurrent').click();assert($('#nearbyCurrent').disabled);geoRequests.at(-1).error({code:1});assert($('#nearbyMessage').textContent.includes('권한'));assert(!$('#nearbyCurrent').disabled);assert.equal(state.nearby.kind,'stay');
    $('#locBtn').click();geoRequests.at(-1).success({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lng,accuracy:15}});assert.equal(state.nearby.kind,'current');assert.equal(localStorage.getItem('viettrip_nearby_stay_v1'),stored);
    $('#nearbyCurrent').click();const staleLocation=geoRequests.at(-1);$('#nearbyStay').click();staleLocation.success({timestamp:Date.now(),coords:{latitude:21,longitude:105,accuracy:20}});assert.equal(state.nearby.lat,origin.lat,'late GPS cannot replace a newer action');
    assert.equal($('#nearbySavedName').textContent,'테스트 숙소');$('#nearbyUseSaved').click();assert.equal(state.nearby.kind,'stay');
    // Fresh repeated readings must beat the first coarse result, without moving prematurely.
    let watches=[],stoppedWatches=[];
    navigator.geolocation.watchPosition=(success,error,options)=>{const id=watches.length;watches.push({success,error,options});return id};
    navigator.geolocation.clearWatch=id=>stoppedWatches.push(id);
    const fix=(watch,lat,lng,accuracy,timestamp=Date.now())=>watch.success({timestamp,coords:{latitude:lat,longitude:lng,accuracy}});
    $('#nearbyCurrent').click();let watch=watches.at(-1);assert.equal(watch.options.maximumAge,0);assert(watch.options.enableHighAccuracy);
    fix(watch,21,105,5000);assert.equal(state.nearby.kind,'stay');assert.equal(state.nearby.lat,origin.lat);assert($('#nearbyMessage').textContent.includes('확인 중'));
    fix(watch,21,105,10,Date.now()-30000);assert.equal(state.nearby.lat,origin.lat,'cached precise-looking result is ignored');
    fix(watch,origin.lat,origin.lng,20);assert.equal(state.nearby.kind,'current');assert.equal(state.nearby.accuracy,20);assert(stoppedWatches.includes(0),'watch ID zero is cleaned up');assert($('#nearbyAccuracy').textContent.includes('20m'));assert(!$('#nearbyCurrent').disabled);
    $('#nearbyCurrent').click();watch=watches.at(-1);fix(watch,21,105,2000);firePositionDeadline();assert.equal(state.nearby.lat,origin.lat);assert($('#nearbyMessage').textContent.includes('적용하지 않았습니다'));assert(stoppedWatches.includes(1));
    $('#nearbyCurrent').click();watch=watches.at(-1);fix(watch,10.772,106.7,150);fix(watch,10.773,106.7,280);assert.equal(state.nearby.lat,10.772);assert.equal(state.nearby.accuracy,150,'usable fix applies immediately; later worse callbacks are ignored');
    $('#nearbyCurrent').click();watch=watches.at(-1);fix(watch,21,105,NaN);fix(watch,21,105,-1);fix(watch,21,105,null);firePositionDeadline();assert.equal(state.nearby.lat,10.772);assert(!$('#nearbyCurrent').disabled);
    $('#nearbyCurrent').click();watch=watches.at(-1);watch.error({code:1});assert($('#nearbyMessage').textContent.includes('권한'));assert(stoppedWatches.includes(4));
    // Manual correction needs an explicit map point and confirmation, cancels GPS, and is private.
    $('#nearbyCurrent').click();watch=watches.at(-1);$('#nearbyPick').click();assert(nearby.isPicking());assert($('#nearbyPickConfirm').disabled);assert(stoppedWatches.includes(5));
    fix(watch,21,105,10);assert.equal(state.nearby.lat,10.772,'late GPS cannot replace a manual pick');
    let suppressed=0;assert(nearby.handleMapClick({placeId:'poi',latLng:{lat:()=>10.774,lng:()=>106.7},stop(){suppressed++}}));assert.equal(suppressed,1);assert(!$('#nearbyPickConfirm').disabled);assert.equal(state.nearby.lat,10.772,'preview does not change the origin');
    $('#nearbyPickCancel').click();assert(!nearby.isPicking());assert.equal(state.nearby.lat,10.772);assert($('#nearbyPickControls').hidden);
    $('#nearbyPick').click();nearby.handleMapClick({latLng:{lat:10.774,lng:106.7}});$('#nearbyPickConfirm').click();assert.equal(state.nearby.kind,'manual');assert.equal(state.nearby.lat,10.774);assert(!nearby.isPicking());assert($('#nearbyAccuracy').hidden);assert.equal(localStorage.getItem('viettrip_nearby_stay_v1'),stored);
    $('#nearbyPick').click();switchCity('hcmc');assert(!nearby.isPicking());assert($('#nearbyPickControls').hidden);
    $('#nearbyStay').click();$('#nearbyUseSaved').click();state.cat='restaurant';state.sub='한식';

    // Explicit search only; input changes/closing invalidate asynchronous results.
    $('#nearbyStay').click();$('#nearbyStayQuery').value='테스트 다른 호텔';$('#nearbyStayQuery').dispatchEvent(new Event('input'));assert.equal(searches.length,0);
    $('#nearbyStayForm').dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(searches.length,1);assert.deepEqual(searches[0].request.fields,['name','formatted_address','geometry']);
    $('#nearbyStayForm').dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(searches.length,1,'repeat submit while pending makes no duplicate request');
    $('#nearbyStayQuery').value='새 검색';$('#nearbyStayQuery').dispatchEvent(new Event('input'));
    searches[0].callback([{name:'오래된 결과',geometry:{location:{lat:()=>21,lng:()=>105}}}],'OK');assert(!$('#nearbyStayResults').textContent.includes('오래된 결과'));
    $('#nearbyStayForm').dispatchEvent(new Event('submit',{cancelable:true}));searches.at(-1).callback([{name:'<img src=x onerror=alert(1)>',formatted_address:'실제 주소',geometry:{location:{lat:()=>10.775,lng:()=>106.7}}}],'OK');
    assert(!$('#nearbyStayResults img'));assert($('#nearbyStayResults').textContent.includes('<img'));
    $('#nearbyStayResults button').click();assert.equal(state.nearby.lat,10.775);assert.equal(state.cat,'restaurant');assert.equal(JSON.parse(localStorage.getItem('viettrip_nearby_stay_v1')).name,'새 검색');assert.equal(JSON.parse(localStorage.getItem('viettrip_nearby_stay_v1')).address,'');
    $('#nearbyStay').click();$('#nearbyStayQuery').value='없는 호텔';$('#nearbyStayForm').dispatchEvent(new Event('submit',{cancelable:true}));searches.at(-1).callback([],'ZERO_RESULTS');assert($('#nearbyStayStatus').textContent.includes('결과가 없습니다'));assert(!$('#nearbyStaySearch').disabled);
    $('#nearbyStayClose').click();assert(!$('#nearbyStayDialog').open);
    const oldOrigin=state.nearby;assert.equal(nearby.apply({name:'잘못된 위치',lat:null,lng:106}),false);assert.equal(state.nearby,oldOrigin);
    $('#nearbyClear').click();assert(!nearby.active());assert.equal(state.city,'hcmc');assert.equal(state.sort,'newest');assert($('#nearbyDistanceSort').disabled);assert(!$('#list .nearbyDistance'));
    nearby.apply({...origin,name:'숙소'});switchCity('hanoi');assert(!nearby.active());assert.equal(state.city,'hanoi');assert.equal($('#nearbySelection').hidden,true);
    $('#nearbyStay').click();$('#nearbyForgetStay').click();assert.equal(localStorage.getItem('viettrip_nearby_stay_v1'),null);
    $('#nearbyStayClose').click();
    // Fast coarse and precise requests run together, with bounded cache age and explicit consent for coarse fixes.
    $('#nearbyCurrent').click();const fast=geoRequests.at(-1);
    assert.equal(fast.options.enableHighAccuracy,false);assert.equal(fast.options.maximumAge,15000);assert.equal(fast.options.timeout,4500);
    fast.success({timestamp:Date.now()-14000,coords:{latitude:10.776,longitude:106.7,accuracy:180}});
    assert.equal(state.nearby.lat,10.776,'recent usable fix applies without waiting for deadline');assert(!$('#nearbyCurrent').disabled);
    $('#nearbyCurrent').click();watch=watches.at(-1);fix(watch,10.778,106.7,2000);
    assert.equal(state.nearby.lat,10.776,'coarse location cannot silently replace origin');assert(!$('#nearbyApproximate').hidden);
    $('#nearbyApproximate').click();assert.equal(state.nearby.lat,10.778);assert.equal(state.nearby.accuracy,2000);assert.equal(state.nearby.name,'기기 추정 위치');assert($('#nearbyApproximate').hidden);
    fix(watch,21,105,10);assert.equal(state.nearby.lat,10.778,'cancelled watcher cannot overwrite explicit coarse choice');
    $('#nearbyCurrent').click();const staleFast=geoRequests.at(-1);staleFast.success({timestamp:Date.now()-30000,coords:{latitude:21,longitude:105,accuracy:5}});assert.equal(state.nearby.lat,10.778,'expired cache ignored');staleFast.error({code:1});assert(!$('#nearbyCurrent').disabled);
    // Fit the entire search circle above the taller controls in four viewport shapes.
    Bounds.prototype.getNorthEast=function(){return {lat:()=>Math.max(...this.points.map(p=>p.lat)),lng:()=>Math.max(...this.points.map(p=>p.lng))}};
    Bounds.prototype.getSouthWest=function(){return {lat:()=>Math.min(...this.points.map(p=>p.lat)),lng:()=>Math.min(...this.points.map(p=>p.lng))}};
    Bounds.prototype.getCenter=function(){const ne=this.getNorthEast(),sw=this.getSouthWest();return {lat:()=>(ne.lat()+sw.lat())/2,lng:()=>(ne.lng()+sw.lng())/2}};
    let width=390,height=650,clock=0,frames=[],center=origin,zoom=12;
    const map=$('#map');Object.defineProperties(map,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
    map.getBoundingClientRect=()=>({top:0,left:0,right:width,bottom:height,width,height});
    $('#areaLegend').getBoundingClientRect=()=>({left:10,right:width-10,top:height-24-(height<300?150:176),bottom:height-24,width:width-20,height:height<300?150:176});
    window.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};performance.now=()=>clock;
    window.matchMedia=q=>({matches:q.includes('max-width')?width<=900:width>900});
    state.map={getDiv:()=>map,getCenter:()=>({lat:()=>center.lat,lng:()=>center.lng}),getZoom:()=>zoom,setCenter:p=>{center=p},setZoom:z=>{zoom=z}};
    smoothFitBounds=realSmoothFitBounds;
    state.cat='all';state.sub='all';nearby.apply({...origin,name:'카메라 검증 숙소'});
    function flush(){let steps=0;while(frames.length){assert(++steps<100);clock+=40;const queue=frames;frames=[];queue.forEach(fn=>fn(clock))}}
    for(const viewport of [[1280,800],[390,650],[360,480],[844,240]]){
      [width,height]=viewport;nearby.setRadius(3000);flush();
      const bounds=makeBounds();extendBoundsByCircle(bounds,origin,3000);
      for(const p of bounds.points){
        const scale=256*2**zoom,x=width/2+(p.lng-center.lng)/360*scale,y=height/2+(mercatorY(p.lat)-mercatorY(center.lat))*scale;
        assert(x>=0&&x<=width,'circle fits horizontally at '+viewport);assert(y>=0&&y<=$('#areaLegend').getBoundingClientRect().top,'circle fits above nearby controls at '+viewport+': '+y);
      }
    }

   `);
  }finally{dom.window.close()}
 }
 console.log('PASS PC/mobile nearby map/list parity, radius and distance sort, category/subtype/rating/benefit/search filters, remembered stays, current location/denial/stale callbacks, search costs, escaped results and city/reset cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
