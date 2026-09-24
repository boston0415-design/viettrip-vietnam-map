const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),read=p=>fs.readFileSync(p,'utf8'),asURL=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
(async()=>{
 const askURL=asURL(read('functions/api/ask-map.js')),ask=await import(askURL),answer=await import(asURL(read('functions/api/answer-map.js').replace("'./ask-map.js'",JSON.stringify(askURL))));
 for(const q of ['호치민 쌀국수 원탑은?','호치민 쌀국수 제일 맛있는 곳','호치민 쌀국수 최고 어디야?']){
  const i=ask.literalIntent(q,'all');assert(i,q);assert.equal(i.city,'hcmc');assert.equal(i.category,'restaurant');assert.deepEqual(i.terms,['쌀국수']);assert.equal(i.sortBy,'top_rated');
 }
 assert.equal(ask.literalIntent('호치민 쌀국수 말고 분짜 원탑은?','hcmc'),null,'exclusions are not swallowed by short-question grammar');
 const base={relevant:true,city:'hcmc',category:'restaurant',terms:['쌀국수','원탑'],unsupported:['원탑'],preferences:[]};
 const clarified=ask.clarifyIntent(base,'호치민 쌀국수 원탑은?');assert.deepEqual(clarified.terms,['쌀국수']);assert.deepEqual(clarified.unsupported,[]);assert(clarified.pickOne);
 assert.equal(ask.modelJSON({output:[{type:'reasoning',content:[{text:'not JSON'}]},{type:'message',content:[{type:'output_text',text:'{"picks":[]}'}]}]}).picks.length,0);
 const request=(body,origin='https://map.test')=>new Request('https://map.test/api/answer-map',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const body={query:'호치민 쌀국수 원탑은?',pickOne:true,candidates:[{id:'c0',name:'Phở Test',address:'Quận 1, Hồ Chí Minh',source:'google',rating:4.8,count:500,menuNamed:true,member:false,reviews:[{text:'SECRET REVIEW',createdBy:'PRIVATE_ID'}],token:'SECRET_TOKEN'}]};
 let calls=0;
 const env={AI:{run:async(model,args)=>{calls++;assert(Array.isArray(args.input),'OpenAI binding receives Responses API input');assert(!args.messages);assert.equal(args.reasoning.effort,'low');assert(args.max_output_tokens>0);assert(!JSON.stringify(args).includes('SECRET'));assert(!JSON.stringify(args).includes('PRIVATE_ID'));return {response:{picks:[{id:'c0',reasons:['specialty','rating','reviews']}]}};}}};
 let res=await answer.onRequest({request:request(body),env});assert.equal(res.status,200);assert.equal((await res.json()).picks[0].id,'c0');
 res=await answer.onRequest({request:request(body,'https://evil.test'),env});assert.equal(res.status,403);assert.equal(calls,1);
 res=await answer.onRequest({request:request({...body,candidates:[]}),env});assert.equal(res.status,200);assert.deepEqual((await res.json()).picks,[]);assert.equal(calls,1,'empty results never spend an AI call or invent places');
 const facts=answer.facts(body);assert.throws(()=>answer.validatePicks({picks:[{id:'fake',reasons:['rating']}]},facts));assert.throws(()=>answer.validatePicks({picks:[{id:'c0',reasons:['benefit']}]},facts),'cannot invent benefits');assert.throws(()=>answer.validatePicks({picks:[{id:'c0',reasons:['price']}]},facts),'cannot invent prices');
 let retries=0;res=await answer.onRequest({request:request(body),env:{AI:{run:async()=>{retries++;return {response:{picks:[{id:'fake',reasons:['rating']}]}};}}}});assert.equal(res.status,503);assert.equal(retries,2);
 res=await ask.onRequest({request:request({query:'퍼와 분짜가 뭐가 달라?',city:'hcmc'}),env:{AI:{run:async()=>({response:{mode:'advice',answer:'퍼는 국물 쌀국수이고 분짜는 구운 돼지고기와 쌀국수를 곁들여 먹어요.'}})}}});const advice=(await res.json()).intent;assert.equal(advice.mode,'advice');assert.deepEqual(advice.terms,[]);assert.throws(()=>ask.validateIntent({mode:'advice',answer:'https://fake.test에서 예약 완료했어요'},'hcmc'));
 const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
 w.matchMedia=()=>({matches:false});for(const file of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+file));
 run(read('assets/js/ai-map-search.js'));run(read('assets/js/ai-map-answer.js'));
 assert(w.AIMapSearch.menuKeyword('Phở Lệ','쌀국수'));assert(!w.AIMapSearch.menuKeyword('Wonton noodles','쌀국수'));assert(!w.AIMapSearch.evidenceFor([{text:'쌀국수는 팔지 않아요'}],'쌀국수'));
 const list=w.document.getElementById('aiMapResults'),entry={query:body.query,intent:{city:'hcmc',terms:['쌀국수'],pickOne:true},memberRows:[{place:{id:'one',name:'테스트 식당',address:'Hồ Chí Minh',description:'PRIVATE',createdBy:'PRIVATE'},rating:5,ratingCount:1,insights:{}}],google:{rows:[{placeId:'google-pho',name:'Phở Test',address:'Hồ Chí Minh',rating:4.8,ratingCount:2000,insights:{}}]}};
 assert.equal(w.AIMapAnswer.snapshot(entry)[0].row.placeId,'google-pho','single-vote perfect score cannot displace well-reviewed menu specialist');
 let finish,sent,opened;w.PlaceSearch={openGoogle:r=>opened=r.placeId};w.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);assert(!opts.body.includes('PRIVATE'));return new Promise(resolve=>finish=resolve);};
 const before=JSON.stringify(entry.memberRows);w.AIMapAnswer.render(list,entry);assert(list.querySelector('.aiAnswer'));assert.equal(sent.candidates[0].name,'Phở Test');
 // Refocus recreates the list while the same paid request is pending.
 list.replaceChildren();w.AIMapAnswer.render(list,entry);finish({ok:true,json:async()=>({picks:[{id:'c0',reasons:['specialty','rating','reviews']}],basis:'ai'})});await new Promise(r=>setTimeout(r,10));assert.match(list.textContent,/Phở Test/);assert.equal(list.querySelectorAll('.aiAnswerPick').length,1);
 list.querySelector('.aiAnswerPick').click();assert.equal(opened,'google-pho');assert.equal(JSON.stringify(entry.memberRows),before);
 let extra=0;w.fetch=async()=>{extra++;throw Error('must not refetch cached answer')};list.replaceChildren();w.AIMapAnswer.render(list,entry);assert.equal(extra,0);
 // Late responses from a cleared question cannot overwrite the new UI.
 w.fetch=async()=>new Promise(resolve=>finish=resolve);const next={...entry,query:'다른 식당',answer:null};list.replaceChildren();w.AIMapAnswer.render(list,next);w.AIMapAnswer.cancel();list.replaceChildren();finish({ok:true,json:async()=>({picks:[{id:'c0',reasons:['rating']}]})});await new Promise(r=>setTimeout(r,10));assert.equal(list.textContent,'');assert.equal(next.answer,null);
 w.AIMapAnswer.advice(list,'<img src=x onerror=alert(1)>');assert.equal(list.querySelectorAll('img').length,0,'advice is text, never HTML');
 dom.window.close();console.log('PASS conversational intent, advice, response envelopes, grounded IDs/reasons, private-data minimization, shortlist evidence, stale/refocus/cached answer and direct detail');
})().catch(e=>{console.error(e);process.exitCode=1});
