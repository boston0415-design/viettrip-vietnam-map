const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const base={relevant:true,city:'hcmc',district:'',area:'',category:'restaurant',subcategory:'',terms:[],preferences:[],benefit:false,recommended:false,nearby:false,visitToday:false,unsupported:[]};
 const fish=api.clarifyIntent({...base,subcategory:'일식',terms:['회','일식당']},'푸미흥에서 횟집 찾아줘');
 assert.equal(fish.subcategory,'');assert.equal(fish.area,'푸미흥');assert.deepEqual(fish.terms,['회']);
 const meat=api.clarifyIntent({...base,subcategory:'한식',terms:['고기집','맛있는']},'푸미흥에서 맛있는 고기집 찾아줘');
 assert.equal(meat.subcategory,'');assert.deepEqual(meat.terms,['고기·구이']);
 assert.equal(api.clarifyIntent({...base,terms:['삼겹살']},'푸미흥에서 삼겹살 고기집 찾아줘').terms.includes('삼겹살'),true,'specific meat stays required');
 const french=api.clarifyIntent({...base},'프랑스 요리 먹을 수 있는 식당 찾아줘');
 assert.equal(french.subcategory,'프랑스');assert.equal(french.cuisineAsMenu,true);
 const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.matchMedia=()=>({matches:false});
 for(const f of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
 run(read('assets/js/place-photos.js'));run(read('assets/js/ai-google-search.js'));run(read('assets/js/ai-map-search.js'));
 const place=(id,name,extra={})=>({id,name,category:'restaurant',subcategory:'한식',address:'Phú Mỹ Hưng, Hồ Chí Minh',lat:10.72975,lng:106.71302,initialRating:4,...extra});
 const data={places:[
  place('hang','행님아',{tags:['해산물','초밥·회','강추업소'],memberBenefit:true}),
  place('fish-viet','베트남 식당',{subcategory:'베트남',description:'Sashimi available'}),
  place('wrong','노출 금지 회식 장소',{subcategory:'일식',tags:['해산물','강추업소'],memberBenefit:true}),
  place('no-fish','노출 금지 식당',{description:'회는 판매하지 않습니다.'}),
  place('bbq','BBQ Table',{subcategory:'베트남'}),place('tag','태그 등록 식당',{tags:['고기·구이']}),place('review','삼원'),
  place('wrong-area','다른 동네 횟집',{address:'Quận 1, Hồ Chí Minh',lat:10.78,lng:106.7}),
  place('mixed','현지 혼합 메뉴',{subcategory:'베트남',description:'프랑스 요리와 베트남 메뉴 제공'}),
  place('travel','프랑스 여행 후기',{subcategory:'베트남',description:'프랑스 여행 가기 전에 먹은 베트남 음식'})
 ],reviews:[{id:'meat-review',placeId:'review',text:'야외 고기집입니다.',rating:4},{id:'old-review',placeId:'hang',text:'모둠회가 좋았어요.',rating:5}]};
 const before=JSON.stringify(data),ids=intent=>Array.from(w.AIMapSearch.buildResults(intent,data,null).rows,r=>r.place.id).sort();
 assert.deepEqual(ids(fish),['fish-viet','hang'],'raw fish is a menu, not Japanese nationality or generic seafood');
 assert.deepEqual(ids(meat),['bbq','review','tag'],'tags, BBQ names and member reviews all qualify');
 assert.deepEqual(ids({...fish,recommended:true,benefit:true}),['hang'],'promotions only within matching menu');
 assert.deepEqual(ids({...fish,terms:['광어회']}),[],'specific fish is not replaced by broad sashimi');
 assert.deepEqual(ids(french),['mixed'],'Vietnamese classification can offer documented French cuisine');
 assert(w.AIMapSearch.areaMatches(place('address','Address',{address:'Tân Phong, Quận 7, Hồ Chí Minh'}),'푸미흥'),'known neighbourhood coordinates resolve missing address label');
 assert(!w.AIMapSearch.areaMatches(place('far','Far',{address:'Quận 7, Hồ Chí Minh',lat:10.76,lng:106.735}),'푸미흥'),'not all district seven is Phu My Hung');
 const raw=(id,name,extra={})=>({id,displayName:name,types:['restaurant','vietnamese_restaurant'],formattedAddress:'Tân Phong, Quận 7, Hồ Chí Minh',location:{lat:10.72975,lng:106.71302},rating:4.8,userRatingCount:60,businessStatus:'OPERATIONAL',addressComponents:[{types:['country'],shortText:'VN'}],...extra});
 const credit={displayName:'메뉴 후기 작성자',uri:'https://maps.google.com/reviewer'};
 const records=[raw('g-fish','Google Sashimi'),raw('g-review','Google 현지 메뉴',{reviews:[{text:'사시미를 먹었습니다.',authorAttribution:credit,googleMapsURI:'https://maps.google.com/review'}]}),raw('g-wrong','노출 금지 해산물',{types:['restaurant','seafood_restaurant','japanese_restaurant']}),raw('g-no','노출 금지',{editorialSummary:'No sashimi available.'}),raw('g-chicken','bbq Chicken',{types:['restaurant','chicken_restaurant']}),raw('g-bbq','BBQ Grill'),raw('g-type','구이 타입',{types:['restaurant','barbecue_restaurant']}),raw('g-fr','혼합 French 메뉴',{reviews:[{text:'French cuisine is served here.',authorAttribution:credit}]})];
 let request,calls=0;w.google={maps:{places:{Place:{searchByText:async r=>{request=r;calls++;return {places:records}}}}}};
 assert.deepEqual(Array.from(await w.AIGoogleSearch.search(fish),r=>r.placeId).sort(),['g-fish','g-review']);
 assert.equal(request.includedType,'restaurant');assert(request.fields.includes('reviews'));assert(!request.textQuery.includes('Japanese'));
 assert.equal(calls,2,'sparse menu search has at most one bounded supplemental query');
 assert.deepEqual(Array.from(w.AIGoogleSearch.rowsFrom(records,meat),r=>r.placeId).sort(),['g-bbq','g-type']);
 assert.deepEqual(Array.from(await w.AIGoogleSearch.search(french),r=>r.placeId),['g-fr']);assert.equal(request.includedType,'restaurant');
 w.data=data;run('db=()=>data;state.sharedDbLoading=false;state.city="hcmc";');w.fetch=async()=>({ok:true,json:async()=>({intent:fish})});
 const input=w.document.getElementById('aiMapQuestion');input.value='푸미흥에서 횟집 찾아줘';input.dispatchEvent(new w.Event('input'));w.document.getElementById('aiMapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));
 assert.equal(w.document.querySelectorAll('.aiMemberResult').length,2);assert.equal(w.document.querySelectorAll('.aiGoogleResult').length,2);
 assert.match(w.document.querySelector('.aiResult').textContent,/행님아/);assert.equal(w.document.querySelectorAll('.aiRecommended').length,1);assert.equal(w.document.querySelectorAll('.aiBenefit').length,1);
 assert.match(w.document.querySelector('.aiRoomCredit').textContent,/메뉴 후기 작성자/);assert(!w.document.getElementById('aiMapResults').textContent.includes('노출 금지'));
 let selected;w.PlaceSearch={openMember:id=>{selected=id;}};w.document.querySelector('[data-place-id="hang"]').click();assert.equal(selected,'hang');assert.equal(w.document.getElementById('aiMapPanel').hidden,true);
 assert.equal(JSON.stringify(data),before,'no place or review mutations');dom.window.close();
 console.log('PASS menu vs cuisine, Hangnim raw fish, BBQ aliases, mixed French offerings, geographic scope, Google evidence and attribution, direct selection and preserved data');
})().catch(e=>{console.error(e);process.exitCode=1});
