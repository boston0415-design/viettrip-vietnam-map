const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{for(const width of [390,1440]){
 const w=new JSDOM('<div class="mapwrap"><div id="map"></div></div>',{runScripts:'outside-only',url:'https://example.test'}).window;w.innerWidth=width;w.HTMLElement.prototype.scrollIntoView=()=>{};
 const places=[{id:'a',name:'도착지',lat:10.75,lng:106.7},{id:'b',name:'벤탄시장',lat:10.77,lng:106.69},{id:'c',name:'롯데마트',lat:10.74,lng:106.71}];let calls=[],predictions=[];
 w.state={selected:'a',map:{fitBounds(){},getCenter:()=>({lat:10.77,lng:106.7})}};w.db=()=>({places});w.PlaceSearch={localMatches:q=>places.filter(p=>p.name.includes(q))};w.businessDirectionsUrl=()=> 'https://google.com/maps/dir/?api=1';w.closeDetailPanel=()=>{w.state.selected=null};
 w.googlePhotoPosition=p=>p?.geometry?.location||p;
 w.googlePhotoRequest=(svc,method,req)=>method==='getDetails'?Promise.resolve({name:'Sunrise Cityview',place_id:req.placeId,formatted_address:'호치민',geometry:{location:{lat:10.746,lng:106.701}}}):new Promise(resolve=>predictions.push({req,resolve}));
 w.google={maps:{places:{AutocompleteService:class{},PlacesService:class{}},SymbolPath:{CIRCLE:'circle'},Polyline:class{setMap(){}},LatLngBounds:class{extend(){}},importLibrary:async()=>({DirectionsService:class{async route(req){calls.push(req);return {routes:[{legs:[{distance:{value:4000},duration:{value:720},steps:[{instructions:'직진',path:[{lat:10.77,lng:106.69},{lat:10.75,lng:106.7}]}]}]}]}}}})}};
 Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition:(ok,fail)=>fail()}});
 for(const f of ['name-search','route-place-search','destination-line'])w.eval(fs.readFileSync('assets/js/'+f+'.js','utf8'));
 w.DestinationLine.open();await tick();const d=w.document,from=d.getElementById('route-origin'),to=d.getElementById('route-destination');assert(!d.querySelector('select'),'no travel mode control');
 const type=(input,text)=>{input.value=text;input.dispatchEvent(new w.Event('input'))},enter=input=>input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 type(from,'벤탄시장');enter(from);await tick();assert.equal(calls.length,1,'immediate Enter selects exact origin and calculates');assert.equal(calls[0].origin.lat,10.77);assert(d.body.textContent.includes('4.0km'));assert(!d.body.textContent.includes('자동차'));
 enter(from);await tick();assert.equal(calls.length,2,'Enter on already selected endpoint recalculates without searching');
 type(to,'선라이즈 시티뷰');enter(to);await tick();assert.equal(predictions.at(-1).req.input,'sunrise cityview');predictions.at(-1).resolve([{place_id:'sunrise',description:'Sunrise Cityview'}]);await tick();assert.equal(calls.length,3,'one Enter resolves external place and calculates');assert.equal(calls.at(-1).destination.placeId,'sunrise');
 type(to,'롯데마트');to.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,cancelable:true}));await tick();assert.equal(calls.length,3,'IME confirmation does not submit partial text');enter(to);await tick();assert.equal(calls.length,4);assert.equal(calls.at(-1).destination.lat,10.74);
 type(to,'old');enter(to);await tick();const old=predictions.at(-1);type(to,'롯데마트');enter(to);await tick();const count=calls.length;old.resolve([{place_id:'wrong',description:'Wrong'}]);await tick();assert.equal(calls.length,count,'stale search cannot route after a newer Enter');w.close();
}console.log('PASS 390/1440 immediate Enter, external lookup-to-route, selected endpoint retry, no mode UI, IME and stale response');})().catch(e=>{console.error(e);process.exitCode=1});
