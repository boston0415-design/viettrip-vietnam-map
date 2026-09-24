const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const base={relevant:true,city:'hcmc',category:'',area:'',district:'',terms:[],unsupported:[],preferences:[]};
 for(const [q,dest] of [['꼰선섬 어떻게 가야해?','conson-choice'],['콘손섬 가는 방법','conson-choice'],['Con Son how to get there?','conson-choice'],['껀터 꼰선섬 어떻게 가야해?','conson-cantho'],['Cồn Sơn 가는 방법','conson-cantho'],['꼰다오 꼰선섬 가는 방법','condao'],['Côn Sơn 가는 방법','condao'],['꼰선섬 어떻게 가야해? [목적지: 껀터의 Cồn Sơn]','conson-cantho']]){
  const res=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query:q,city:'hcmc'})}),env:{AI:{run(){throw Error('known destination must not call the model')}}}});
  assert.equal(res.status,200,q);const {intent}=await res.json();assert.equal(intent.travelDestination,dest,q);assert(!intent.guideTopic);assert.equal(intent.requestText,q);
 }
 assert.equal(api.destinationIntent('껀터 꼰선섬 근처 식당 찾아줘','hcmc'),null,'destination routing must not swallow business searches');
 const bad=api.extendIntent({...base,guideTopic:'river-trip'},'리선섬 어떻게 가야해?','hcmc');assert(!bad.guideTopic);assert(bad.travelHelp);
 const empty=api.extendIntent(base,'이 답변이 왜 틀렸어?','hcmc');assert(!empty.relevant,'empty intent must not list every business');
 const fakeRoute=api.extendIntent({...base,transport:{origin:'hcmc',destination:'phuquoc',originExplicit:false}},'리선섬 어떻게 가야해?','hcmc');assert(!fakeRoute.transport);assert(fakeRoute.travelHelp);
 const good=api.extendIntent({...base,guideTopic:'river-trip'},'사이공강 유람선 어떻게 예약해?','hcmc');assert.equal(good.guideTopic,'river-trip');
 for(const width of [390,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://map.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  Object.defineProperty(w,'innerWidth',{value:width});vm.runInContext(read('assets/js/ai-travel-search.js'),dom.getInternalVMContext());
  const list=d.getElementById('aiMapResults');let submitted=0;d.getElementById('aiMapForm').requestSubmit=()=>submitted++;
  w.AITravelSearch.render(list,api.destinationIntent('꼰선섬 어떻게 가야해?','hcmc'));
  assert.equal(list.querySelectorAll('button').length,2);list.querySelector('button').click();assert.equal(submitted,1);assert(d.getElementById('aiMapQuestion').value.includes('껀터의 Cồn Sơn'));
  list.replaceChildren();const intent=api.destinationIntent(d.getElementById('aiMapQuestion').value,'hcmc');w.AITravelSearch.render(list,intent);
  assert.match(list.textContent,/꼬박 선착장/);assert.match(list.textContent,/5~10분/);assert(!list.textContent.includes('유람선'));
  const source=[...list.querySelectorAll('a')].find(a=>a.textContent.includes('관광청'));assert.equal(source.hostname,'vietnam.travel');
  let query='';w.PlaceSearch={submit(){query=d.getElementById('searchInput').value}};list.querySelector('button').click();assert.match(query,/Cô Bắc.*Cần Thơ/);
  list.replaceChildren();w.AITravelSearch.render(list,bad);assert.equal(list.querySelectorAll('.aiMemberResult').length,0);assert.equal(new URL(list.querySelector('a').href).searchParams.get('q'),bad.requestText);
  dom.window.close();
 }
 console.log('PASS destination identity/accents, ambiguity selection, real route actions, no unrelated guide or broad empty-intent lists on mobile/desktop');
})().catch(e=>{console.error(e);process.exitCode=1});
