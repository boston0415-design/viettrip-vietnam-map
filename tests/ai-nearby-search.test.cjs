const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 for(const [query,category,anchor] of [['벤탄시장 근처 맛집 추천해줘','restaurant','벤탄시장'],['롯데호텔근처 카페 추천해줘','cafe','롯데호텔'],['여기 근처 마사지 추천해줘','spa',''],['내 주변 한식당 추천해줘','restaurant',''],['숙소 주변 쌀국수 맛집','restaurant',''],['호치민 벤탄시장 인근 카페','cafe','호치민 벤탄시장']]){
  const intent=api.recoveryIntent(query,'hcmc');assert(intent,query);assert.equal(intent.category,category,query);assert.equal(intent.nearbyReference.anchor,anchor);assert.equal(intent.nearby,true);assert.equal(intent.sortBy,'nearby_best');assert(!intent.terms.includes(anchor));
 }
 assert.equal(api.recoveryIntent('벤탄시장 근처 한식 말고 식당 추천해줘','hcmc'),null,'never erase exclusions');
 assert.equal(api.recoveryIntent('벤탄시장 근처 500m 이내 맛집','hcmc').nearbyReference.radius,500);
 assert.equal(api.recoveryIntent('벤탄시장 근처 저렴한 식당','hcmc').sortBy,'cheap','explicit preferences beat default recommendation');
 const query='벤탄시장 근처 맛집 추천해줘',intent=api.recoveryIntent(query,'hcmc');
 const response=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query,city:'hcmc'})}),env:{}});
 assert.equal((await response.json()).intent.nearbyReference.anchor,'벤탄시장','named nearby questions work without an AI provider');
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
  Object.defineProperty(w,'innerWidth',{value:width});w.matchMedia=()=>({matches:width<900});
  for(const f of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
  for(const f of ['name-search','place-photos','ai-search-insights','ai-query-intent','ai-nearby-search','ai-google-search','ai-map-search','ai-map-answer'])run(read('assets/js/'+f+'.js'));
  const fixture={places:[
   {id:'anchor',name:'벤탄시장',category:'market',address:'Ben Thanh, Ho Chi Minh',lat:10.77,lng:106.7},
   {id:'tiny',name:'회원 등록 한 표 식당',category:'restaurant',address:'Ho Chi Minh',lat:10.771,lng:106.7,initialRating:5,memberBenefit:true,tags:['강추업소']},
   {id:'distant',name:'멀리 있는 유명 식당',category:'restaurant',address:'Ho Chi Minh',lat:10.85,lng:106.7,initialRating:5},
   {id:'wrong',name:'근처 카페',category:'cafe',address:'Ho Chi Minh',lat:10.771,lng:106.7,initialRating:5}
  ],reviews:[{id:'keep',placeId:'tiny',text:'원본 후기 유지',rating:5}]};
  w.fixture=fixture;run('db=()=>fixture;state.city="hcmc";state.sharedDbLoading=false;state.nearby=null;state.map={getCenter:()=>({lat:()=>10.77,lng:()=>106.7})};');
  const before=JSON.stringify(fixture),scope=run('JSON.stringify([state.city,state.nearby,state.selected])');
  const raw=(id,rating,count,lat)=>({id,displayName:id,formattedAddress:'Ho Chi Minh',location:{lat,lng:106.7},rating,userRatingCount:count,types:['restaurant'],addressComponents:[{types:['country'],shortText:'VN'}]});
  const google=[raw('가까운 검증 후기 식당',4.8,500,10.775),raw('바로 옆 낮은 평점',4.1,1000,10.7701),raw('먼 유명 식당',5,5000,10.82)];
  let requests=[];w.google={maps:{places:{Place:{searchByText:async request=>{requests.push(request);return {places:google}}}}}};
  const resolved=await w.AINearbySearch.resolve(intent,{places:fixture.places});assert.equal(resolved.nearbyOrigin.name,'벤탄시장');assert.equal(requests.length,0,'registered reference coordinates need no lookup');
  assert.deepEqual(Array.from(w.AIMapSearch.findMatches(resolved,fixture,null),r=>r.place.id),['tiny']);
  const rows=w.AIGoogleSearch.rowsFrom(google,resolved);assert.deepEqual(Array.from(rows,r=>r.placeId),['가까운 검증 후기 식당','바로 옆 낮은 평점']);
  assert(rows[0].distance>500&&rows[0].distance<600);assert(w.AISearchInsights.compare(rows[0],w.AIMapSearch.findMatches(resolved,fixture,null)[0],resolved)<0,'one perfect community score does not beat substantial nearby evidence');
  const broadDistrict=w.AIGoogleSearch.boundsFor({...resolved,district:'1'},[{properties:{era:'2020',sourceName:'Quan 1'},geometry:{type:'Polygon',coordinates:[[[106,10],[107,11]]]}}]);assert(broadDistrict.north<10.80,'nearby restriction takes precedence over broad district bounds');
  w.fetch=async()=>({ok:true,json:async()=>({intent})});
  const input=d.getElementById('aiMapQuestion'),form=d.getElementById('aiMapForm');input.value=query;input.dispatchEvent(new w.Event('input'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,50));
  assert.equal(d.querySelector('.aiAnswerPick').textContent,'먼저 추천 · 가까운 검증 후기 식당');assert.match(d.querySelector('.aiNearbyContext').textContent,/벤탄시장 기준 · 반경 2km/);assert.match(d.querySelector('.aiNearbyDistance').textContent,/직선거리/);
  assert.equal(d.querySelector('.aiGoogleResults .aiResult').dataset.googlePlaceId,'가까운 검증 후기 식당','visible list and answer share the recommendation order');
  assert(!d.querySelector('[data-place-id="distant"]'));assert(!d.querySelector('[data-google-place-id="먼 유명 식당"]'));assert(requests.at(-1).locationRestriction);assert.equal(requests.at(-1).maxResultCount,20);
  [...d.querySelectorAll('.aiNearbyContext button')].find(b=>b.textContent==='500m').click();await new Promise(r=>setTimeout(r,30));assert(!d.querySelector('[data-google-place-id="가까운 검증 후기 식당"]'),'radius change rechecks every result');
  const here=await w.AINearbySearch.resolve(api.recoveryIntent('여기 근처 카페','hcmc'),{places:fixture.places});assert.equal(here.nearbyOrigin.name,'현재 지도 중심','map origin is disclosed, never called current GPS location');
  const missing=await w.AINearbySearch.resolve(api.recoveryIntent('숙소 근처 카페','hcmc'),{places:fixture.places});assert.equal(missing.nearbyOrigin,null,'missing accommodation is not replaced with map center');
  run('state.nearby={lat:10.79,lng:106.71,name:"기존 숙소",kind:"stay",radius:500};');
  const explicit=await w.AINearbySearch.resolve(intent,{places:fixture.places});assert.equal(explicit.nearbyOrigin.lat,10.77,'named reference overrides unrelated saved context only for this query');
  run('state.nearby=null;');
  const multiple=await w.AINearbySearch.resolve({...intent,nearbyReference:{kind:'named',anchor:'지점 카페'}},{places:[{id:'a',name:'지점 카페',category:'cafe',address:'Ho Chi Minh',lat:10.77,lng:106.7},{id:'b',name:'지점 카페',category:'cafe',address:'Ho Chi Minh',lat:10.80,lng:106.7}]});assert.equal(multiple.nearbyOrigin,null);assert.equal(multiple.nearbyOptions.length,2,'ambiguous branches remain a choice');
  let complete;w.google.maps.places.Place.searchByText=()=>new Promise(r=>complete=r);const controller=new w.AbortController();const pending=w.AINearbySearch.resolve({...intent,nearbyReference:{kind:'named',anchor:'새 기준 장소'}},{signal:controller.signal,places:[]});controller.abort();await assert.rejects(pending,e=>e.name==='AbortError');complete({places:[]});
  assert.equal(JSON.stringify(fixture),before);assert.equal(run('JSON.stringify([state.city,state.nearby,state.selected])'),scope,'queries do not change map filters or save an address');
  dom.window.close();
 }
 console.log('PASS named-nearby interpretation, query-local origin, radius filtering, quality/sample/distance ranking, source blending, visible shortlist, explicit preferences, ambiguity, cancellation and data preservation at 390/1440');
})().catch(e=>{console.error(e);process.exitCode=1});
