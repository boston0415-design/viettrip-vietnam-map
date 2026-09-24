const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/ask-map.js')).toString('base64'));
 const base={relevant:true,city:'hcmc',district:'',area:'',category:'restaurant',subcategory:'',terms:[],preferences:[],benefit:false,recommended:false,nearby:false,visitToday:false,unsupported:[]};
 const french=api.clarifyIntent(api.validateIntent({...base,benefit:true,recommended:true},'hcmc'),'여자 친구와 갈만한 조용한 식당 안내해줘. 프랑스 식당으로');
 assert.equal(french.subcategory,'프랑스');assert.equal(french.category,'restaurant');assert.equal(french.benefit,false);assert.equal(french.recommended,false);assert(french.preferences.includes('quiet'));assert(french.preferences.includes('date'));
 for(const alias of ['프랑스','프렌치','French','French restaurant'])assert.equal(api.validateIntent({...base,subcategory:alias},'hcmc').subcategory,'프랑스');
 const variant=api.clarifyIntent(api.validateIntent({...base,terms:['프랑스 식당'],subcategory:'프랑스'},'hcmc'),'베트남에서 프랑스 식당 찾아줘');assert.equal(variant.subcategory,'프랑스');assert.equal(variant.terms.length,0);assert.equal(variant.unsupported.length,0);
 assert.equal(api.clarifyIntent({...base},'이탈리안 식당 추천해줘').subcategory,'이탈리아');
 const unknown=api.validateIntent({...base,subcategory:'조지아'},'hcmc');assert(unknown.terms.includes('조지아'),'unknown narrow cuisine cannot disappear');
 const endorsed=api.clarifyIntent({...base,subcategory:'프랑스'},'회원 강추 제휴 프랑스 식당 찾아줘');assert(endorsed.benefit&&endorsed.recommended);
 const dom=new JSDOM(read('index.html'),{url:'https://map.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.matchMedia=()=>({matches:false});
 for(const f of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+f));
 run(read('assets/js/place-photos.js'));run(read('assets/js/ai-google-search.js'));run(read('assets/js/ai-map-search.js'));
 for(const cuisine of Array.from(run('CONFIG.categories.restaurant.subs'))){assert.equal(api.validateIntent({...base,subcategory:cuisine},'hcmc').subcategory,cuisine,'preserve registration cuisine '+cuisine);assert(w.AIGoogleSearch.queryFor({...base,subcategory:cuisine}).includes('restaurant'));}
 const data={places:[
  {id:'fr',name:'프랑스 등록 식당',category:'restaurant',subcategory:'프랑스',initialRating:3,lat:10.779,lng:106.702,address:'Quận 1, Hồ Chí Minh'},
  {id:'fr-benefit',name:'프랑스 강추 제휴',category:'restaurant',subcategory:'프랑스',initialRating:4,lat:10.779,lng:106.702,address:'Quận 1, Hồ Chí Minh',memberBenefit:true,tags:['강추업소']},
  ...['한식','베트남','일식'].map((subcategory,i)=>({id:'wrong-'+i,name:subcategory+' 강추 제휴',category:'restaurant',subcategory,initialRating:5,memberBenefit:true,tags:['강추업소'],lat:10.779,lng:106.702,address:'Quận 1, Hồ Chí Minh'}))
 ],reviews:[{id:'r',placeId:'wrong-0',rating:5,recommended:true,text:'프랑스 여행 가기 전에 먹은 한식.'}]};
 const before=JSON.stringify(data),matches=w.AIMapSearch.buildResults(french,data,null);
 assert.deepEqual(Array.from(matches.rows,r=>r.place.id),['fr-benefit','fr']);assert(!matches.fallback);
 assert.equal(w.AIMapSearch.buildResults(endorsed,data,null).rows.length,1);
 assert.equal(w.AIMapSearch.buildResults({...french,terms:['동태탕']},data,null).rows.length,0,'do not substitute menu-mismatched French or cuisine-mismatched Korean food');
 assert.equal(w.AIMapSearch.buildResults({...french,subcategory:'스페인'},data,null).rows.length,0,'no cuisine broadening after zero results');
 assert.equal(JSON.stringify(data),before);
 const raw=(id,types)=>({id,types,displayName:id,formattedAddress:'Quận 1, Hồ Chí Minh',location:{lat:10.779,lng:106.702},rating:4.8,userRatingCount:55,businessStatus:'OPERATIONAL',addressComponents:[{types:['country'],shortText:'VN'}]});
 const records=[raw('French Table',['french_restaurant','restaurant']),raw('Maison Test',['french_restaurant','restaurant']),raw('Korean Top',['korean_restaurant','restaurant']),raw('Vietnamese Top',['vietnamese_restaurant','restaurant']),raw('French sounding name',['restaurant'])];
 let request,calls=0;w.google={maps:{places:{Place:{searchByText:async r=>{request=r;calls++;return {places:records}}}}}};
 assert.equal((await w.AIGoogleSearch.search(french)).length,2);assert.equal(request.includedType,'french_restaurant');assert.equal(request.useStrictTypeFiltering,true);assert(request.fields.includes('types'));assert.match(request.textQuery,/French restaurant/);
 assert.equal(w.AIGoogleSearch.rowsFrom(records,{...french,subcategory:'일식'}).length,0);
 assert.equal(w.AIGoogleSearch.rowsFrom(records,{...french,terms:['동태탕']}).length,0,'Google broad matches do not prove a specific menu');
 const count=calls;assert.equal((await w.AIGoogleSearch.search(endorsed)).length,0);assert.equal(calls,count,'community benefits require local evidence, not Google rating');
 w.data=data;run('db=()=>data;state.sharedDbLoading=false;state.city="hcmc";');
 w.fetch=async()=>({ok:true,json:async()=>({intent:french})});
 const input=w.document.getElementById('aiMapQuestion'),form=w.document.getElementById('aiMapForm');input.value='프랑스 식당 찾아줘';input.dispatchEvent(new w.Event('input'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.querySelectorAll('.aiMemberResult').length,2);assert.equal(w.document.querySelectorAll('.aiGoogleResult').length,2);
 assert(!/Korean Top|Vietnamese Top|한식 강추|베트남 강추|일식 강추/.test(w.document.getElementById('aiMapResults').textContent));
 assert.equal(w.document.querySelectorAll('.aiMemberResult .aiBenefit').length,1);assert.equal(w.document.querySelectorAll('.aiMemberResult .aiRecommended').length,1);
 assert.equal(JSON.stringify(data),before);dom.window.close();
 console.log('PASS every registered cuisine, French aliases, exact local/Google cuisine eligibility, hard menus, truthful promotions, zero-match handling and preserved reviews');
})().catch(e=>{console.error(e);process.exitCode=1});
