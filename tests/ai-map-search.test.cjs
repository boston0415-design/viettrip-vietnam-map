const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const intent={relevant:true,city:'hcmc',district:'1',area:'',preferences:[],visitToday:false,category:'restaurant',subcategory:'한식',terms:['동태탕'],benefit:false,recommended:false,nearby:false,unsupported:[]};
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 let aiCalls=0;
 const env={AI:{run:async(model,body)=>{aiCalls++;assert(!JSON.stringify(body).includes('비공개 닉네임'));return {choices:[{message:{content:JSON.stringify(intent)}}]};}}};
 const req=(body,extra={})=>new Request('https://map.test/api/ask-map',{method:'POST',headers:{origin:'https://map.test','content-type':'application/json',...extra},body:JSON.stringify(body)});
 let response=await api.onRequest({request:req({query:'1군 동태탕 한식당',city:'hcmc'}),env});assert.equal(response.status,200);assert.deepEqual((await response.json()).intent,intent);
 response=await api.onRequest({request:req({query:'동태탕'}, {origin:'https://other.test'}),env});assert.equal(response.status,403);
 response=await api.onRequest({request:req({query:'가'.repeat(301)}),env});assert.equal(response.status,400);
 response=await api.onRequest({request:req({query:'동태탕'}),env:{}});assert.equal(response.status,503);
 assert.equal(aiCalls,1,'invalid input and unavailable binding never invoke AI');
 response=await api.onRequest({request:req({query:'동태탕'}),env:{AI:{run:async()=>({response:'{"relevant":true}'})}}});assert.equal(response.status,503,'invalid model response is not reported as search results');
 assert.throws(()=>api.validateIntent({...intent,district:'1|11'},'hcmc'));
 const wrong=api.validateIntent({...intent,relevant:false,city:'hcmc',district:'',category:'',terms:[],preferences:[]},'hcmc');
 const hanoi=api.clarifyIntent(wrong,'하노이에서 회원들이 강추한 식당 찾아줘');
 assert.equal(hanoi.relevant,true);assert.equal(hanoi.city,'hanoi');assert.equal(hanoi.category,'restaurant');assert.equal(hanoi.recommended,true);
 const date=api.clarifyIntent(wrong,'오늘 여자친구와 갈만한 1군에서 분위기 좋은 바를 찾아줘');
 assert.equal(date.category,'bar');assert.equal(date.subcategory,'바');assert.equal(date.district,'1');assert(date.preferences.includes('date'));assert(date.preferences.includes('atmosphere'));assert(date.visitToday);

 const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();
 const run=s=>vm.runInContext(s,ctx);w.assert=assert;w.matchMedia=()=>({matches:false});
 for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+file));
 run(`const aiFixture={places:[
 {id:'one',name:'한식당 1',category:'restaurant',subcategory:'한식',area:'호치민',address:'10 Test, Quận 1, Hồ Chí Minh',lat:10.77,lng:106.7,description:'한식 메뉴'},
 {id:'eleven',name:'한식당 11',category:'restaurant',subcategory:'한식',area:'호치민',address:'Quận 11, Hồ Chí Minh',description:'동태탕',lat:10.77,lng:106.7},
 {id:'unknown',name:'한식당 주소 미확인',category:'restaurant',subcategory:'한식',area:'호치민',address:'184 Test',description:'동태탕',lat:10.77,lng:106.7}
 ],reviews:[{id:'r1',placeId:'one',text:'동태탕은 오늘 없다고 했어요. 다음에 다시 갈 예정입니다.',recommended:true}]};db=()=>aiFixture;state.city='hcmc';state.sharedDbLoading=false;`);
 run(read('assets/js/ai-map-search.js'));
 w.intent=intent;
 run(`const before=JSON.stringify(aiFixture);const found=AIMapSearch.findMatches(intent,aiFixture,null);assert.equal(found.length,1);assert.equal(found[0].place.id,'one');assert(found[0].evidence[0].includes('없다고'),'negative mentions are quoted faithfully rather than claiming availability');assert.equal(JSON.stringify(aiFixture),before,'search cannot change places/reviews');assert(!AIMapSearch.districtMatches({address:'Q.11'},'1'));assert(AIMapSearch.districtMatches({address:'Q.1, HCM'},'1'));`);
 run(`
   const data={places:[
    {id:'ha1',name:'하노이 식당 A',category:'restaurant',subcategory:'베트남',area:'하노이',address:'Hà Nội',lat:21.03,lng:105.84,initialRating:4,memberBenefit:true,benefitText:'회원 음료 혜택'},
    {id:'ha2',name:'하노이 식당 B',category:'restaurant',subcategory:'베트남',area:'하노이',address:'Hà Nội',lat:21.03,lng:105.84,initialRating:5},
    {id:'hc',name:'호치민 강추 식당',category:'restaurant',subcategory:'한식',area:'호치민',address:'Hồ Chí Minh',lat:10.77,lng:106.7,tags:['강추업소']}
   ],reviews:[]};
   const wanted={...intent,city:'hanoi',district:'',subcategory:'',terms:[],recommended:true};
   const alternativesBefore=JSON.stringify(data),result=AIMapSearch.buildResults(wanted,data,null);
   assert(result.fallback);assert.equal(result.rows.length,2,'return all matching registered alternatives');assert.equal(result.rows[0].place.id,'ha2','actual rating determines fallback order');
   assert(result.rows.every(row=>!row.recommended),'fallback cannot invent recommendation flags');assert.equal(JSON.stringify(data),alternativesBefore);
   data.reviews.push({id:'ha-review',placeId:'ha1',rating:4,recommended:true,text:'맛있어요'});
   const exact=AIMapSearch.buildResults(wanted,data,null);assert(!exact.fallback);assert.equal(exact.rows.length,1);assert.equal(exact.rows[0].place.id,'ha1');
   const menu=AIMapSearch.buildResults({...wanted,recommended:false,terms:['동태탕']},data,null);assert(menu.fallback);assert(menu.rows.every(row=>row.missingTerms.includes('동태탕')));
   assert.equal(AIMapSearch.buildResults({...wanted,district:'1'},data,null).rows.length,0,'never silently broaden district');
   const bars={places:[{id:'plain',name:'먼저 나온 바',category:'bar',area:'호치민',lat:10.77,lng:106.7,initialRating:5},{id:'mood',name:'분위기 바',category:'bar',area:'호치민',lat:10.77,lng:106.7,description:'분위기가 좋고 데이트하기 좋아요.',initialRating:4}],reviews:[]};
   const ranked=AIMapSearch.buildResults({...intent,district:'',category:'bar',subcategory:'',terms:[],preferences:['date','atmosphere']},bars,null);assert.equal(ranked.rows.length,2);assert.equal(ranked.rows[0].place.id,'mood');bars.places.push({id:'club',name:'클럽',category:'bar',subcategory:'클럽',area:'호치민',lat:10.77,lng:106.7,initialRating:5});assert.equal(AIMapSearch.buildResults({...intent,district:'',category:'bar',subcategory:'바',terms:[]},bars,null).rows.length,2,'a bar request does not become a nightclub list');
 `);
 const boundaries=JSON.parse(read('assets/data/admin/hcmc.geojson')).features;w.boundaries=boundaries;
 run(`assert(AIMapSearch.districtMatches({address:'Lê Thánh Tôn, Sài Gòn, Hồ Chí Minh',area:'호치민',lat:10.779,lng:106.702},'1',boundaries),'new ward address is matched through historical district geometry');assert(!AIMapSearch.districtMatches({address:'Quận 11, Hồ Chí Minh',lat:10.779,lng:106.702},'1',boundaries),'explicit conflicting district is never overwritten');assert(!AIMapSearch.districtMatches({address:'Thảo Điền, Hồ Chí Minh',lat:10.803,lng:106.732},'1',boundaries));`);
 let finish;w.fetch=()=>new Promise(resolve=>{finish=resolve});
 const input=w.document.getElementById('aiMapQuestion'),form=w.document.getElementById('aiMapForm'),panel=w.document.getElementById('aiMapPanel');
 input.value='1군 동태탕 한식당';input.dispatchEvent(new w.Event('input'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));
 input.value='다른 질문';input.dispatchEvent(new w.Event('input'));
 finish({ok:true,json:async()=>({intent})});await new Promise(r=>setTimeout(r,5));
 assert.equal(w.document.querySelectorAll('.aiResult').length,0,'late replies cannot replace an edited question');
 w.fetch=async()=>({ok:true,json:async()=>({intent})});
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.equal(w.document.querySelectorAll('.aiResult').length,1);assert.equal(panel.hidden,false);
 const rendered=w.document.querySelector('.aiResult').textContent;assert.match(rendered,/회원 후기/);assert.match(rendered,/없다고/);
 let opened;w.PlaceSearch={openMember:id=>{opened=id},dismiss:()=>{}};w.document.querySelector('.aiResult').click();assert.equal(opened,'one');assert.equal(panel.hidden,true);
 w.fetch=async()=>({ok:false,json:async()=>({error:'잠시 후 다시 시도해 주세요.'})});input.focus();form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.match(w.document.getElementById('aiMapStatus').textContent,/잠시 후/);
 dom.window.close();console.log('PASS AI endpoint validation, grounded district/review matching, stale response, failure and detail selection');
})().catch(e=>{console.error(e);process.exitCode=1});
