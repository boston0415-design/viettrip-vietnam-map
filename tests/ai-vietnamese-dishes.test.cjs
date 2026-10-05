const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 for(const word of ['껌승집','껌 승','껌수언 전문점','껌스언집','Cơm sườn','com suon','Cơm tấm sườn']){
  const q='선라이즈 근처 '+word,r=api.recoveryIntent(q,'hcmc');
  assert.equal(r.category,'restaurant',q);assert.deepEqual(r.terms,['껌승'],q);assert.equal(r.nearbyReference.anchor,'선라이즈');
  const response=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query:q,city:'hcmc'})}),env:{AI:{run(){throw Error('routine dish lookup must not need AI')}}}});
  assert.deepEqual((await response.json()).intent.terms,['껌승']);
 }
 for(const [q,term] of [['껌땀집','껌땀'],['Cơm tấm 맛집','껌땀'],['분차집','분짜'],['Bún chả 맛집','분짜'],['반세오 전문점','반쎄오'],['Bánh xèo 식당','반쎄오'],['분팃느엉집','분팃느엉'],['Cơm gà 식당','껌가']])assert.deepEqual(api.recoveryIntent(q,'hcmc').terms,[term],q);
 for(const q of ['선라이즈 근처 껌승 말고 껌가','선라이즈 근처 껌승 계란 추가 식당','선라이즈 근처 껌승 24시간 식당'])assert.equal(api.recoveryIntent(q,'hcmc'),null,'extra conditions must survive: '+q);
 assert.equal(api.dishFor('껌승 계란 추가'),null);assert.equal(api.dishFor('com tamarind'),null);
 assert(api.dishMatch('Cơm Tấm Sườn Bì Chả','껌승'));assert(api.dishMatch('Cơm Tấm Sườn Bì Chả','껌땀'));
 assert(!api.dishMatch('Cơm Gà','껌승'));assert(!api.dishMatch('Cơm Tấm','껌승'),'related venue does not prove pork');
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
  Object.defineProperty(w,'innerWidth',{value:width});w.matchMedia=()=>({matches:width<900});
  for(const f of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
  for(const f of ['name-search','place-photos','ai-search-insights','ai-query-intent','ai-nearby-search','ai-google-search','ai-map-search','ai-map-answer'])run(read('assets/js/'+f+'.js'));
  const fixture={places:[{id:'anchor',name:'선라이즈 아파트',category:'stay',address:'Ho Chi Minh',lat:10.73,lng:106.66},{id:'member',name:'Cơm Sườn Nhà',category:'restaurant',address:'Ho Chi Minh',lat:10.731,lng:106.66,initialRating:4.1}],reviews:[{id:'keep',placeId:'member',text:'기존 후기 원문',rating:4.1}]};
  w.fixture=fixture;run('db=()=>fixture;state.city="hcmc";state.sharedDbLoading=false;state.nearby=null;');
  const before=JSON.stringify(fixture),q='선라이즈 근처 껌승집';
  const intent=await w.AINearbySearch.resolve(api.recoveryIntent(q,'hcmc'),{places:fixture.places});
  assert.equal(intent.nearbyOrigin.name,'선라이즈 아파트');
  const english=await w.AINearbySearch.resolve(api.recoveryIntent('Sunrise 근처 껌승집','hcmc'),{places:fixture.places});assert.equal(english.nearbyOrigin.name,'선라이즈 아파트');
  assert.equal(w.NameSearch.googleQuery('썬라이즈'),'sunrise');
  assert.equal(w.AIMapSearch.findMatches(intent,fixture,null)[0].place.id,'member');
  assert(!w.AIMapSearch.evidenceFor([{label:'메뉴',text:'Không bán cơm sườn'}],'껌승'));
  const place=(id,name,lat=10.734,extra={})=>({id,displayName:name,formattedAddress:'Ho Chi Minh',location:{lat,lng:106.66},types:['restaurant'],rating:4.8,userRatingCount:300,addressComponents:[{types:['country'],shortText:'VN'}],...extra});
  const raw=[place('known','Cơm Sườn Nướng'),place('related','Cơm Tấm Test',10.7301,{rating:5,userRatingCount:9999}),place('wrong','Phở Test'),place('chicken','Cơm Gà Test'),place('vegan','Cơm Tấm Chay'),place('denied','Cơm Tấm No Pork',10.732,{editorialSummary:'No pork served here.'}),place('far','Cơm Sườn Far',10.8)];
  const rows=w.AIGoogleSearch.rowsFrom(raw,intent);assert.deepEqual(Array.from(rows,r=>r.placeId),['known','related']);assert.equal(rows[1].menuUnconfirmed[0],'껌승');
  let requests=[],opened;
  w.google={maps:{places:{Place:{searchByText:async request=>{requests.push(request);return {places:raw}}}}}};
  w.fetch=async()=>({ok:true,json:async()=>({intent:api.recoveryIntent(q,'hcmc')})});w.PlaceSearch={dismiss(){},openGoogle:row=>opened=row.placeId};
  const input=d.getElementById('aiMapQuestion');input.value=q;input.dispatchEvent(new w.Event('input'));d.getElementById('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,60));
  assert.match(requests[0].textQuery,/cơm sườn/);assert(!requests[0].textQuery.includes('껌승집'));assert.match(requests[0].textQuery,/near sunrise/);assert(requests[0].locationRestriction);assert(requests.length<=2,'at most one supplemental dish query');
  assert.match(d.querySelector('.aiAnswerPick').textContent,/Cơm Sườn Nướng/);assert.match(d.querySelector('[data-google-place-id="related"]').textContent,/껌승 메뉴는 확인 필요/);assert.match(d.querySelector('.aiAnswer').textContent,/껌승 메뉴 확인 필요/);
  d.querySelector('[data-google-place-id="known"]').click();assert.equal(opened,'known');assert.equal(JSON.stringify(fixture),before);assert.equal(run('state.nearby'),null);
  dom.window.close();
 }
 console.log('PASS Sunrise/com-suon aliases, shared Vietnamese dish interpretation/query/evidence, qualified com-tam leads, negative/different menu rejection, radius, ranking, direct detail and preserved records on mobile/desktop');
})().catch(e=>{console.error(e);process.exitCode=1});
