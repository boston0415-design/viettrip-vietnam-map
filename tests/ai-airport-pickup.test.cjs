const {JSDOM}=require('jsdom');const fs=require('fs');const assert=require('node:assert/strict');
for(const width of [390,1280]){
 const d=new JSDOM('<div id="aiMapResults"></div><div id="aiMapExamples"></div><div id="aiMapTitle"></div><div id="aiMapStatus"></div><div id="aiMapNote"></div>',{runScripts:'outside-only'});const w=d.window;w.innerWidth=width;
 w.eval('var state={city:"hanoi",map:{}};var EXTRA_DATA={hcmc:{points:[1,2,3].map(n=>({type:"그랩승차",name:"Grab T"+n+" 승차"}))}};var selected="";function switchCity(c){state.city=c}function jumpToPoi(n){selected=n}');let closed=0;w.ChatDock={close(){closed++}};
 w.eval(fs.readFileSync('assets/js/ai-airport-pickup.js','utf8'));const a=w.AIAirportPickup,list=w.document.getElementById('aiMapResults');
 assert(a.matches('공항에서 그랩타고 싶어'));a.render(list);assert(list.textContent.includes('떤선녓'));assert.equal(w.eval('selected'),'');
 assert(a.matches('떤션녓'));a.render(list);assert(list.textContent.includes('T3'));assert.equal(w.eval('selected'),'');
 [...list.querySelectorAll('button')].find(b=>b.textContent.startsWith('T2')).click();assert.equal(w.eval('selected'),'Grab T2 승차');assert.equal(w.eval('state.city'),'hcmc');assert.equal(closed,1);assert(list.textContent.includes('주차장'));
 assert(a.matches('T3'));a.render(list);a.showMap(true);assert.equal(w.eval('selected'),'Grab T3 승차');assert(list.textContent.includes('PNA'));
 assert.equal(a.matches('맛있는 라멘집 알려줘'),false);assert.equal(a.active,false);
 assert(a.matches('떤선녓 국제선에서 그랩 타고 싶어'));a.render(list);assert(list.textContent.includes('Grab T2'));
 assert(a.matches('공항에서 그랩 타고 싶어'));a.render(list);assert(!list.textContent.includes('Grab T2'));
 assert.equal(a.matches('호치민에서 맛있는 햄버거집 찾아서 그랩푸드로 연결해줘'),false);
 assert.equal(a.matches('호치민에서 그랩 타고 벤탄시장 가고 싶어'),false);
 assert(a.matches('공항에서 그랩 타고 싶어'));assert(a.matches('떤션녓이요'));assert(a.matches('T2요'));assert(a.matches('국내선'));a.render(list);assert(list.textContent.includes('T1 · 국내선'));
 assert.equal(a.matches('호치민 프랑스 음식점 추천해줘'),false);
 assert(a.matches('떤선녓 공항 그랩'));a.reset();assert.equal(a.active,false);

}
console.log('Airport selection, terminal context, correct pickup POI, city switch and drawer close pass at mobile/desktop widths');
