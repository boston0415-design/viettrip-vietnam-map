const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const query='내일 정모인데 모일만한 장소 추천해줘';
 const base={relevant:true,city:'hcmc',district:'',area:'',category:'',subcategory:'',terms:[],preferences:[],unsupported:[]};
 for(const [q,category,district,sub] of [
  [query,'restaurant','',''],['내일 10명 정모인데 1군 한식당 추천해줘','restaurant','1','한식'],
  ['정모할 카페 추천해줘','cafe','',''],['정모라서 조용한 식당 추천해줘','restaurant','',''],
  ['7군 회식 장소 찾아줘','restaurant','7',''],['노트북 작업할 카페 알려줘','cafe','',''],
  ['배고파 밥 먹을 곳 추천해줘','restaurant','',''],['친구와 맥주 한잔 할 곳 추천해줘','bar','','바'],
  ['머리 자를 곳 추천해줘','barber','','']
 ]){
  const i=api.recoveryIntent(q,'hcmc');assert(i,q);assert.equal(i.category,category,q);assert.equal(i.district,district,q);assert.equal(i.subcategory,sub,q);assert.deepEqual(i.terms,[],q);assert.deepEqual(i.unsupported,[],q);
 }
 for(const q of ['내일 정모인데 부산에서 식당 추천해줘','정모인데 1군 말고 식당 추천해줘','정모 공지 글 써줘','정모라서 땅콩 알레르기 없는 식당','모임인데 동태탕 파는 한식당','정모인데 타오디엔 식당'])assert.equal(api.contextualIntent(q,'hcmc'),null,'do not drop unknown geography, exact menu, exclusion or content request: '+q);
 const model=api.clarifyIntent({...base,category:'cafe',terms:['정모','내일'],unsupported:['내일 영업','10명 수용','1군 제외']},query);
 assert.equal(model.category,'restaurant');assert.deepEqual(model.terms,[]);assert.deepEqual(model.unsupported,['1군 제외']);assert(model.inquiryConditions.includes('10명 수용'));
 const req=q=>new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query:q,city:'hcmc'})});
 let calls=0;const response=await api.onRequest({request:req(query),env:{AI:{run:()=>{calls++;throw Error('provider down')}}}});assert.equal(response.status,200);assert.equal(calls,0,'meeting intent does not depend on model availability');
 const intent=(await response.json()).intent;assert(intent.preferences.includes('group'));assert(intent.inquiryConditions.length);assert(!intent.visitToday,'tomorrow must never be labelled as today');assert(!intent.features?.includes('private_room'),'group is not proof of a private room');
 const broken=await api.onRequest({request:req('하노이에서 세탁물을 맡기고 싶어'),env:{AI:{run:async()=>{throw Error('provider down')}}}});
 const exploratory=(await broken.json()).intent;assert(exploratory.exploratory);assert.equal(exploratory.city,'hanoi');assert(exploratory.terms[0].includes('세탁물'));
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
  Object.defineProperty(w,'innerWidth',{value:width});w.matchMedia=()=>({matches:width<900});
  for(const f of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
  run(read('assets/js/place-photos.js'));run(read('assets/js/ai-search-insights.js'));run(read('assets/js/ai-query-intent.js'));run(read('assets/js/ai-google-search.js'));run(read('assets/js/ai-travel-search.js'));run(read('assets/js/ai-map-search.js'));run(read('assets/js/ai-map-answer.js'));
  assert.deepEqual(JSON.parse(JSON.stringify(w.AIQueryIntent.recoveryIntent(query,'hcmc'))),intent,'browser and server use the same rules');
  const fixture={places:[
   {id:'group',name:'모임 안내 식당',description:'단체 모임 가능합니다.',category:'restaurant',subcategory:'한식',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:4},
   {id:'plain',name:'일반 식당',category:'restaurant',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:5},
   {id:'cafe',name:'모임 카페',category:'cafe',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:4},
   {id:'bar',name:'대화 펍',category:'bar',subcategory:'바',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:4},
   {id:'wrong',name:'한식집 하노이',category:'restaurant',subcategory:'한식',address:'Hà Nội',lat:21.03,lng:105.84,initialRating:5}
  ],reviews:[{id:'keep',placeId:'group',text:'원본 후기 유지',rating:4}]};
  const before=JSON.stringify(fixture);w.fixture=fixture;run('db=()=>fixture;state.city="hcmc";state.sharedDbLoading=false;');
  let googleCalls=[];w.google={maps:{places:{Place:{searchByText:async r=>{googleCalls.push(r);return {places:[]}}}}}};
  const input=d.getElementById('aiMapQuestion'),form=d.getElementById('aiMapForm');
  const submit=async(q,fetcher)=>{w.fetch=fetcher;input.value=q;input.dispatchEvent(new w.Event('input'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,30));};
  for(const fetcher of [async()=>({ok:false,json:async()=>({error:'provider failed'})}),async()=>{throw Error('offline')},async()=>({ok:true,json:async()=>{throw SyntaxError('bad JSON')}})]){
   await submit(query,fetcher);assert.equal(d.querySelectorAll('.aiMemberResult').length,2);assert.equal(d.querySelector('.aiMemberResult').dataset.placeId,'group');assert(!/다시 질문해 주세요|연결 또는 응답/.test(d.getElementById('aiMapTitle').textContent));assert.match(googleCalls.at(-1).textQuery,/restaurant group dining Ho Chi Minh City/);assert.match(d.querySelector('.aiSearchContext').textContent,/인원·날짜·예약/);assert.equal(d.querySelectorAll('.aiContextOptions button').length,3);
  }
  d.querySelectorAll('.aiContextOptions button')[2].click();await new Promise(r=>setTimeout(r,25));assert.equal(d.querySelectorAll('.aiMemberResult').length,1);assert.equal(d.querySelector('.aiMemberResult').dataset.placeId,'cafe');assert.match(googleCalls.at(-1).textQuery,/cafe group dining/);
  await submit('내일 10명 정모인데 1군 한식당 추천해줘',async()=>({ok:false,json:async()=>({error:'provider failed'})}));assert.equal(d.querySelectorAll('.aiMemberResult').length,1);assert.equal(d.querySelector('.aiMemberResult').dataset.placeId,'group');assert.equal(d.querySelectorAll('.aiContextOptions button').length,0,'explicit cuisine cannot be changed to bars');assert(!d.querySelector('.aiHours'),'never use today hours for tomorrow');
  await submit(query,async()=>({ok:true,json:async()=>({intent:{mode:'advice',answer:'모임 장소를 골라보세요.',terms:[],unsupported:[]}})}));assert.equal(d.querySelectorAll('.aiMemberResult').length,2,'generic advice cannot replace place search');
  const entry={query,intent,memberRows:w.AIMapSearch.findMatches(intent,fixture,null),google:{rows:[]}};const list=d.getElementById('aiMapResults');list.replaceChildren();w.fetch=async()=>{throw Error('answer model down')};w.AIMapAnswer.render(list,entry);await new Promise(r=>setTimeout(r,20));assert.equal(entry.answer.basis,'search');assert.equal(list.querySelectorAll('.aiAnswerPick').length,2);assert.match(list.textContent,/검색 근거로 추린 후보/);
  list.replaceChildren();w.AIMapAnswer.advice(list,'메뉴 차이를 설명합니다.',null,['쌀국수 맛집 찾아줘','분짜 맛집 찾아줘']);assert.equal(list.querySelectorAll('.aiTravelPlace').length,2);
  let finish;await submit(query,()=>new Promise(resolve=>finish=resolve));d.getElementById('aiMapClear').click();finish({ok:false,json:async()=>({error:'late error'})});await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelectorAll('.aiResult').length,0,'late failures never restore cleared results');
  assert.equal(JSON.stringify(fixture),before,'read-only queries preserve every original review/place');
  assert(w.AIGoogleSearch.queryFor(intent).includes('group dining'));assert(!w.AIGoogleSearch.queryFor(intent).includes('내일'));
  dom.window.close();
 }
 console.log('PASS contextual purposes, tomorrow/headcount/cuisine/region, shared browser/server recovery, HTTP/network/JSON failures, search-backed answer, venue switch, cancellation, and unchanged data at 390/1440');
})().catch(e=>{console.error(e);process.exitCode=1});
