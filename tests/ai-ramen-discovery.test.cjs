const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const base={relevant:true,city:'hcmc',category:'restaurant',subcategory:'',district:'',area:'',terms:[],preferences:[],unsupported:[],benefit:false,recommended:false};
 const query='라멘.가장.맛있는 집 찾아줘';
 const intent=api.literalIntent(query,'hcmc');
 assert(intent,'the reported punctuation and wording work without a model round trip');
 assert.deepEqual(intent.terms,['라멘']);assert.equal(intent.subcategory,'');assert.equal(intent.sortBy,'top_rated');
 for(const q of ['라멘집 알려줘','호치민 라멘 추천해줘','ramen','ラーメン'])assert.deepEqual(api.literalIntent(q,'hcmc').terms,['라멘']);
 assert.equal(api.literalIntent('라멘 말고 짬뽕 찾아줘','hcmc'),null,'an exclusion must not become a positive ramen filter');
 assert.equal(api.literalIntent('돈코츠 라멘 찾아줘','hcmc'),null,'specific styles still need full interpretation');
 const specific=api.clarifyIntent({...base,subcategory:'일식',terms:['돈코츠','라멘집']},'돈코츠 라멘집 찾아줘');
 assert.deepEqual(specific.terms,['돈코츠','라멘']);assert.equal(specific.subcategory,'');
 assert.equal(api.clarifyIntent({...base,terms:['라멘']},'일식당에서 라멘 찾아줘').subcategory,'일식','explicit cuisine remains a constraint');
 let calls=0;
 const response=await api.onRequest({request:new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json'},body:JSON.stringify({query,city:'hcmc'})}),env:{AI:{run:async()=>{calls++;throw Error('unexpected model call')}}}});
 assert.equal(response.status,200);assert.deepEqual((await response.json()).intent.terms,['라멘']);assert.equal(calls,0);
 const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.matchMedia=()=>({matches:false});
 for(const f of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
 run(read('assets/js/place-photos.js'));run(read('assets/js/ai-google-search.js'));run(read('assets/js/ai-map-search.js'));
 const place=(id,name,extra={})=>({id,name,category:'restaurant',subcategory:'중식',address:'Quận 1, Hồ Chí Minh',lat:10.779,lng:106.702,initialRating:4,...extra});
 const data={places:[
  place('doya','Doya Jjambbong 도야짬뽕',{tags:['국수·라멘','강추업소'],description:'중국집',initialRating:5,memberBenefit:true}),
  place('wok','기름진 멜로 Wok of love',{tags:['국수·라멘','찌개·전골','딤섬·만두'],description:'퓨전 중국 요리집'}),
  place('bao','보배반점',{tags:['국수·라멘','국밥·탕','딤섬·만두']}),
  place('japanese','일식당',{subcategory:'일식',tags:['국수·라멘']}),
  place('ramyeon','분식집',{subcategory:'한식',description:'라면과 짬뽕, 우동 판매'}),
  place('named','IPPUDO Ramen',{subcategory:'일식',tags:['국수·라멘']}),
  place('mixed','혼합 메뉴 식당',{tags:['국수·라멘'],description:'돈코츠 라멘 판매',memberBenefit:true}),
  place('review','회원 방문 식당',{tags:['국수·라멘']}),
  place('none','문의 업소',{description:'라멘은 판매하지 않습니다.'}),
  place('uncertain','예정 업소',{description:'라멘이 있나요? 라멘 출시 예정입니다.'})
 ],reviews:[{id:'r1',placeId:'review',text:'점심에 라멘을 먹었습니다.',recommended:true}]};
 const before=JSON.stringify(data);
 const rows=w.AIMapSearch.buildResults(intent,data,null).rows;
 assert.deepEqual(Array.from(rows,r=>r.place.id).sort(),['mixed','named','review'],'combined tags never certify ramen, even for recommended/benefit/Japanese restaurants');
 assert(rows.every(r=>r.evidence.every(e=>!e.includes('국수·라멘'))),'evidence cites the real menu/name/review instead of the combined tag');
 assert.deepEqual(Array.from(w.AIMapSearch.findMatches({...intent,benefit:true},data,null),r=>r.place.id),['mixed']);
 assert.deepEqual(Array.from(w.AIMapSearch.findMatches({...intent,recommended:true},data,null),r=>r.place.id),['review']);
 for(const text of ['국수·라멘','국수 / 라멘','라멘ㆍ국수','국수','짬뽕','拉面','라면','noodles','ramenish'])assert.equal(w.AIMapSearch.menuKeyword(text,'라멘'),'',text+' is not ramen evidence');
 for(const text of ['돈코츠 라멘','라아멘','Ramen IPPUDO','ラーメン'])assert(w.AIMapSearch.menuKeyword(text,'라멘'),text+' is explicit ramen evidence');
 assert.equal(w.AIMapSearch.evidenceFor([{label:'후기',text:'No ramen available.'}],'라멘'),null);
 assert.equal(w.AIMapSearch.buildResults(intent,{places:data.places.slice(0,5),reviews:[]},null).rows.length,0,'no broad noodle fallback');
 const raw=(id,name,extra={})=>({id,displayName:name,types:['restaurant','chinese_restaurant'],formattedAddress:'Quận 1, Hồ Chí Minh',location:{lat:10.779,lng:106.702},rating:4.8,userRatingCount:50,...extra});
 const records=[raw('name','SHODAY RAMEN'),raw('type','麺屋',{types:['restaurant','ramen_restaurant']}),raw('mixed','혼합 식당',{editorialSummary:'돈코츠 라멘 판매'}),raw('review','메뉴 후기 식당',{reviews:[{text:'라멘을 먹었어요.',authorAttribution:{displayName:'작성자'}}]}),raw('chinese','도야짬뽕',{editorialSummary:'중식 · 국수·라멘 · 중국집'}),raw('japanese','일식당',{types:['restaurant','japanese_restaurant']}),raw('noodles','Noodle House',{types:['restaurant','noodle_shop']}),raw('negative','일반 식당',{editorialSummary:'라멘은 판매하지 않습니다.'})];
 const googleBefore=JSON.stringify(records);let request;
 w.google={maps:{places:{Place:{searchByText:async r=>{request=r;return {places:records}}}}}};
 assert.deepEqual(Array.from(await w.AIGoogleSearch.search(intent),r=>r.placeId).sort(),['mixed','name','review','type']);
 assert.match(request.textQuery,/^ramen restaurant/);assert.equal(request.includedType,'restaurant','real mixed-menu restaurants remain eligible');
 assert.equal(JSON.stringify(data),before);assert.equal(JSON.stringify(records),googleBefore,'search does not mutate reviews or business data');
 dom.window.close();console.log('PASS reported ramen query, precise multilingual menu evidence, compound-tag exclusion, mixed cuisine, Google types, benefits/recommendations and data preservation');
})().catch(error=>{console.error(error);process.exitCode=1});
