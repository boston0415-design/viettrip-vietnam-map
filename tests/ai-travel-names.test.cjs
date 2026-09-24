const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const base={relevant:false,city:'hcmc',district:'',area:'',category:'',subcategory:'',terms:[],preferences:[],unsupported:[]};
 for(const [query,origin,destination,mode,explicit] of [
  ['현재 위치가 호치민인데 달랏으로 여행하고 싶은데 교통편 찾아줘','hcmc','dalat','all',true],
  ['달랏으로 가는 교통편 찾아줘','hcmc','dalat','all',false],
  ['달랏에서 호치민까지 버스 찾아줘','dalat','hcmc','bus',true],
  ['달랏으로 호치민에서 가는 기차','hcmc','dalat','train',true],
  ['from Ho Chi Minh to Da Lat flight','hcmc','dalat','flight',true],
  ['to Da Lat from Ho Chi Minh train','hcmc','dalat','train',true],
  ['호치민에서 달랏까지 비행기, 버스, 기차 알아봐줘','hcmc','dalat','all',true]
 ]){const result=api.routeIntent(query,'hcmc');assert(result,query);assert.deepEqual(result.transport,{origin,destination,mode,originExplicit:explicit});
  const response=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query,city:'hcmc'})}),env:{AI:{run(){throw Error('routine routes must not spend AI tokens')}}}});assert.equal(response.status,200);}
 for(const q of ['서울에서 달랏으로 가는 비행기','호치민에서 후에로 가는 버스','달랏으로 하노이 거쳐 가는 비행기','호치민에서 달랏으로 기차 말고 버스','호치민 버스 정류장 근처 식당'])assert.equal(api.routeIntent(q,'hcmc'),null,q);
 assert.equal(api.routeIntent('달랏으로 가는 교통편','all'),null,'no invented origin');
 assert.equal(api.guideIntent('베트남 여행할 때 유심은 어떻게 준비해?','hcmc').guideTopic,'sim-data');
 assert.equal(api.guideIntent('유심 가장 싼 매장 어떻게 찾아?','hcmc'),null);
 assert.equal(api.guideIntent('태국 유심은 어떻게 준비해?','hcmc'),null);
 const q='호치민에서 아이폰 듀오 가장 싸게 파는 매장 알려줘.';
 const retail=api.extendIntent(api.clarifyIntent({...base,terms:['아이폰 듀오'],unsupported:['최저 가격','1군 제외'],preferences:['cheap']},q),q,'hcmc');
 assert(retail.relevant&&retail.productSearch);assert.equal(retail.requestText,q);assert(!retail.sortBy);assert(!retail.showPrice);assert.deepEqual(retail.unsupported,['1군 제외']);
 for(const width of [390,1440]){
 const dom=new JSDOM(read('index.html'),{url:'https://map.test/',runScripts:'outside-only'}),w=dom.window,d=w.document,run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.matchMedia=q=>({matches:q.includes('max-width')?width<=900:false});w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=function(){};
 for(const f of fs.readdirSync('assets/js').filter(f=>/^0[1-8]-/.test(f)).sort())run(read('assets/js/'+f));
 run(read('assets/js/name-search.js'));run(read('assets/js/place-search.js'));run(read('assets/js/ai-search-insights.js'));run(read('assets/js/travel-guide-data.js'));run(read('assets/js/ai-travel-search.js'));run(read('assets/js/ai-google-search.js'));run(read('assets/js/ai-map-search.js'));
 const pairs=[['Onsi Spa','온시 스파'],['Weekend Saigon','위켄드 사이공'],['NJ184 Vietnam Head Spa','엔제이184'],['Bún Mọc Thanh Mai','분목 탄마이'],['Pho Thin My Dinh','포틴 미딩'],['우라에테이','Uraetei'],['온시 스파','Onsi Spa'],['위켄드 사이공','Weekend Saigon']];
 for(const [name,query] of pairs)assert(w.NameSearch.matches(name,query),name+' ↔ '+query);
 assert(!w.NameSearch.matches('Barber Hotel','바'),'whole word alias');assert(!w.NameSearch.matches('NJ184 Spa','엔제이185'),'branch numbers never fuzzy');assert(!w.NameSearch.matches('Onsi Spa Hanoi','온시 스파 호치민'),'different city constraint');
 run(`const nameFixture={places:[{id:'a',name:'Onsi Spa',category:'spa',address:'Nha Trang',area:'나트랑',lat:12.24,lng:109.19},{id:'b',name:'온시 스파',category:'spa',address:'Ha Noi',area:'하노이',lat:21.03,lng:105.84}],reviews:[{id:'r',placeId:'a',text:'친절했어요',rating:4}]};db=()=>nameFixture;state.city='hcmc';state.sharedDbLoading=false;`);
 const before=run('JSON.stringify(nameFixture)');assert.equal(w.PlaceSearch.localMatches('온시 스파').length,2);assert.equal(w.PlaceSearch.localMatches('Onsi Spa').length,2);
 assert(run("matchesBusinessQuery(nameFixture.places[0],'온시 스파')"));assert(w.AIMapSearch.menuKeyword('Onsi Spa','온시 스파'));
 const cards=w.AITravelSearch.routeCards({origin:'hcmc',destination:'dalat',mode:'all'});assert.equal(cards.length,3);assert(cards[2].description.includes('연결되지'));assert(!cards.some(c=>/원|VND|\d+시/.test(c.description)));
 const list=d.getElementById('aiMapResults');const intent={...base,relevant:true,transport:{origin:'hcmc',destination:'dalat',mode:'all',originExplicit:false}};
 const meta=w.AITravelSearch.render(list,intent);assert(meta.status.includes('실제 위치 아님'));assert.equal(list.querySelectorAll('.aiTravelAnswer').length,3);assert.equal(list.querySelector('a').host,'www.vietnamairlines.com');
 let submitted=0;w.PlaceSearch.submit=()=>{submitted++};list.querySelector('button').click();assert.equal(submitted,1);assert.match(d.getElementById('searchInput').value,/Tan Son Nhat/);
 w.fetch=async()=>({ok:true,json:async()=>({intent})});d.getElementById('aiMapQuestion').value='달랏으로 교통편 찾아줘';d.getElementById('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelectorAll('.aiTravelAnswer').length,3);assert.equal(d.getElementById('aiMapPanel').hidden,false);
 list.replaceChildren();const guide=w.AITravelSearch.render(list,{...base,relevant:true,guideTopic:'sim-data'});assert(guide);assert(list.querySelector('a').href.includes('read=sim-data'));
 list.replaceChildren();w.AITravelSearch.fallback(list,'<script>bad</script> & 부산 여행');assert.equal(list.querySelector('script'),null);assert(new URL(list.querySelector('a').href).searchParams.get('query').includes('<script>'));
 assert(!w.AISearchInsights.inspect({priceLevel:'INEXPENSIVE',priceRange:{startPrice:{units:1,currencyCode:'VND'}}},retail).price.known);
 assert.equal(w.AIGoogleSearch.includedType(retail),'cell_phone_store');assert(w.AIGoogleSearch.typeMatches({types:['cell_phone_store']},retail));assert(!w.AIGoogleSearch.typeMatches({types:['restaurant']},retail));assert(w.AIGoogleSearch.queryFor(retail).includes('듀오'));
 assert.equal(run('JSON.stringify(nameFixture)'),before,'never change registrations or reviews');dom.window.close();
 }
 console.log('PASS bidirectional names, branch/city safety, routes and direction, no invented GPS/timetable/price, phone model preservation, guide and card selection on mobile/desktop');
})().catch(e=>{console.error(e);process.exitCode=1});
