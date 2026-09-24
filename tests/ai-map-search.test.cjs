const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const intent={relevant:true,city:'hcmc',district:'1',category:'restaurant',subcategory:'한식',terms:['동태탕'],benefit:false,recommended:false,nearby:false,unsupported:[]};
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
