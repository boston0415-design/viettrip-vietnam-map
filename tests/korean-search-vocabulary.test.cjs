const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const cases=[['분보후에','Bún bò Huế','restaurant'],['후띠우','Hủ tiếu','restaurant'],['까오러우','Cao lầu','restaurant'],['월남쌈','Gỏi cuốn','restaurant'],['에그커피','Cà phê trứng','cafe'],['소금커피','salt coffee','cafe'],['크로와상','croissant','cafe'],['보조배터리','Sạc dự phòng','shopping'],['캐리어','Luggage','shopping'],['우비','Áo mưa','shopping'],['헬멧','Mũ bảo hiểm','shopping'],['선크림','Kem chống nắng','shopping'],['망고스틴','Măng cụt','shopping'],['강아지사료','Thức ăn cho chó','shopping']];
 for(const [ko,foreign,category] of cases){
  const query='선라이즈 근처 '+ko+(category==='shopping'?' 파는 가게':'');
  const r=api.recoveryIntent(query,'hcmc');assert(r,query);assert.equal(r.category,category);assert.equal(r.nearbyReference.anchor,'선라이즈');
  assert.equal(api.searchItemFor(r.terms[0]).query,api.searchItemFor(ko).query);assert(api.searchItemMatch(foreign,ko));
  const response=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query,city:'hcmc'})}),env:{AI:{run(){throw Error('known words must not spend an AI call')}}}});
  assert.equal((await response.json()).intent.category,category);
 }
 for(const q of ['우산 말고 우비','보조배터리 20000mAh 매장','선크림 SPF50 파는 곳','분보후에 계란 추가 식당','캐리어 수리점','보네르 카페'])assert.equal(api.recoveryIntent(q,'hcmc'),null,'preserve unknown constraints/names: '+q);
 for(const [text,term] of [['Kem chống nắng','아이스크림'],['Măng cụt','망고'],['Bún bò Huế','분짜'],['Phở gà','소고기 쌀국수'],['Thức ăn cho chó','볶음밥'],['Charger','보조배터리'],['보네르','보네']])assert(!api.searchItemMatch(text,term),text+' is not '+term);
 assert(api.searchItemMatch('Phở bò','쌀국수'));assert.deepEqual(api.recoveryIntent('닭고기 쌀국수집','hcmc').terms,['닭고기 쌀국수']);
 const base={relevant:true,city:'hcmc',category:'shopping',terms:['아티초크'],unsupported:[],preferences:[]};
 const unknown=api.validateIntent({...base,termTranslations:[{term:'아티초크',en:'artichoke',vi:'atisô'},{term:'다른 상품',en:'different',vi:'khác'}]},'hcmc');
 assert.equal(unknown.termTranslations.length,1);
 assert(!api.validateIntent({...base,termTranslations:[{term:'아티초크',en:'https://evil.invalid',vi:'<script>alert(1)</script>'}]},'hcmc').termTranslations);
 assert(!api.validateIntent({...base,terms:['선크림'],termTranslations:[{term:'선크림',en:'ice cream',vi:'kem'}]},'hcmc').termTranslations,'model cannot override known equivalents');
 let aiCalls=0;
 const translated=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query:'아티초크 파는 가게',city:'hcmc'})}),env:{AI:{run:async()=>{aiCalls++;return {response:JSON.stringify({...base,termTranslations:[{term:'아티초크',en:'artichoke',vi:'atisô'}]})}}}}});
 assert.equal(aiCalls,1);assert.equal((await translated.json()).intent.termTranslations[0].vi,'atisô');
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
  w.matchMedia=()=>({matches:width<900});Object.defineProperty(w,'innerWidth',{value:width});w.HTMLElement.prototype.scrollIntoView=function(){};
  for(const f of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
  for(const f of ['search-vocabulary','name-search','place-photos','place-search','ai-search-insights','ai-query-intent','ai-nearby-search','ai-google-search','ai-map-search','ai-map-answer'])run(read('assets/js/'+f+'.js'));
  assert.equal(w.SearchVocabulary.items.length,new Set(w.SearchVocabulary.items.map(x=>x.term)).size);
  const fixture={places:[{id:'anchor',name:'선라이즈 아파트',category:'stay',address:'Ho Chi Minh',lat:10.73,lng:106.66},...cases.map(([ko,name,category],i)=>({id:'local-'+i,name,category,address:'Ho Chi Minh',lat:10.731,lng:106.66,initialRating:4.5}))],reviews:[{id:'keep',placeId:'local-0',text:'회원 후기 원문',rating:4.5}]};
  w.fixture=fixture;run('db=()=>fixture;state.city="hcmc";state.sharedDbLoading=false;state.nearby=null;');const before=JSON.stringify(fixture);
  for(const [i,[ko,name]] of cases.entries()){
   assert(w.NameSearch.matches(name,ko),name+' ↔ '+ko);assert(w.NameSearch.matches(ko,name),ko+' ↔ '+name);
   assert(w.PlaceSearch.localMatches(ko).some(r=>r.id==='local-'+i),'ordinary registered search '+ko);
   const intent=api.recoveryIntent(ko,'hcmc');assert(w.AIMapSearch.findMatches(intent,fixture,null).some(r=>r.place.id==='local-'+i),'AI registered search '+ko);
  }
  assert(!w.NameSearch.matches('망고스틴 가게','망고'));assert(!w.NameSearch.matches('Kem chống nắng','아이스크림'));assert(!w.NameSearch.matches('NJ184 Spa','엔제이185'));
  assert.match(w.NameSearch.googleQuery('호치민 분보후에집'),/bun bo hue/);assert.match(w.NameSearch.googleQuery('보조배터리 20000mAh'),/sac du phong 20000mah/);
  assert(!w.AIMapSearch.evidenceFor([{label:'후기',text:'No raincoats sold here.'}],'우비'));
  assert(!w.AIMapSearch.evidenceFor([{label:'후기',text:'Sạc dự phòng hết hàng.'}],'보조배터리'));
  const p=(id,name,types=['store'],extra={})=>({id,displayName:name,types,location:{lat:10.732,lng:106.66},formattedAddress:'Ho Chi Minh',rating:4.8,userRatingCount:30,...extra});
  const intent=api.recoveryIntent('선크림 파는 가게','hcmc');
  assert.deepEqual(Array.from(w.AIGoogleSearch.rowsFrom([p('yes','Kem chống nắng'),p('no','Kem ngon',['cafe','store'])],intent),x=>x.placeId),['yes']);
  assert.match(w.AIGoogleSearch.queryFor(intent),/kem chống nắng/);
  const batteryIntent=api.recoveryIntent('보조배터리 파는 곳','hcmc');
  const retailRows=w.AIGoogleSearch.rowsFrom([p('lead','전자 매장',['electronics_store'],{rating:5,userRatingCount:1000,priceLevel:'INEXPENSIVE'}),p('known','Sạc Dự Phòng Shop',['electronics_store']),p('generic','일반 가게',['store']),p('negative','전자 상점',['electronics_store'],{editorialSummary:'No power banks sold here.'}),p('cafe','배터리 카페',['cafe'])],batteryIntent);
  assert.deepEqual(Array.from(retailRows,x=>x.placeId),['known','lead']);assert.equal(retailRows[1].itemUnconfirmed[0],'보조배터리');assert(!retailRows[1].insights.price.known,'store price level is not item price');
  assert.deepEqual(Array.from(w.AIGoogleSearch.rowsFrom([p('unknown','Atisô Đà Lạt'),p('wrong','Other goods')],unknown),x=>x.placeId),['unknown']);assert.match(w.AIGoogleSearch.queryFor(unknown),/atisô/);
  const review={text:'현지 커피를 마셨어요.',originalText:'Cà phê trứng rất ngon.',authorAttribution:{displayName:'작성자'}};
  const coffee=w.AIGoogleSearch.rowsFrom([p('coffee','Cafe Test',['cafe'],{reviews:[review]})],api.recoveryIntent('에그커피','hcmc'))[0];assert(coffee);assert(coffee.proofs.some(x=>x.source.review===review&&x.source.text===review.originalText));
  let predictions=[];w.google={maps:{places:{AutocompleteService:class{getPlacePredictions(r,cb){predictions.push(r);cb([{place_id:'external',structured_formatting:{main_text:'Sạc dự phòng Test',secondary_text:'Ho Chi Minh'}}],'OK')}},AutocompleteSessionToken:class{},Place:{searchByText:async request=>({places:[p('umbrella','Umbrella Shop')]})}}}};
  run('state.map={getCenter:()=>({lat:10.73,lng:106.66})}');w.PlaceSearch.init();
  const normal=d.getElementById('searchInput');normal.value='보조배터리';normal.dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,380));assert.match(predictions[0].input,/sac du phong/);assert(d.getElementById('placeSearchList').textContent.includes('Sạc dự phòng'));
  w.PlaceSearch.dismiss();let opened;w.PlaceSearch.openGoogle=row=>opened=row.placeId;
  const input=d.getElementById('aiMapQuestion');input.value='선라이즈 근처 우산 파는 가게';input.dispatchEvent(new w.Event('input'));d.getElementById('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,60));
  assert.match(d.getElementById('aiMapResults').textContent,/Umbrella Shop/);assert.match(d.getElementById('aiMapResults').textContent,/재고·판매가/);d.querySelector('[data-google-place-id="umbrella"]').click();assert.equal(opened,'umbrella');
  assert.equal(JSON.stringify(fixture),before);dom.window.close();
 }
 console.log('PASS shared Korean/English/Vietnamese food, drink, fruit and object searches; ordinary/AI paths; model translation fallback; accent/compound/constraint safety; original review attribution; inventory wording and preserved records');
})().catch(e=>{console.error(e);process.exitCode=1});
