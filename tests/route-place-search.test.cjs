const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{for(const width of [390,1440]){
 const w=new JSDOM('<div><input id="from" aria-label="출발지"></div><div><input id="to" aria-label="목적지"></div>',{runScripts:'outside-only'}).window;w.innerWidth=width;w.HTMLElement.prototype.scrollIntoView=()=>{};
 let predictions=[],details=[],selected=[],edits=0;w.state={map:{getCenter:()=>({lat:10.77,lng:106.7})}};w.db=()=>({places:[{id:'ben',name:'벤탄시장',lat:10.77,lng:106.7}]});w.PlaceSearch={localMatches:q=>q==='벤탄'? [{id:'ben',name:'벤탄시장',address:'호치민'}]:[]};w.google={maps:{places:{AutocompleteService:class{},PlacesService:class{}}}};w.googlePhotoPosition=p=>p?.geometry?.location||p;
 w.googlePhotoRequest=(service,method,request)=>new Promise(resolve=>{(method==='getDetails'?details:predictions).push({request,resolve})});
 for(const file of ['name-search','route-place-search'])w.eval(fs.readFileSync('assets/js/'+file+'.js','utf8'));
 assert.equal(w.NameSearch.googleQuery('선라이즈 시티뷰'),'sunrise cityview');assert.equal(w.NameSearch.googleQuery('썬라이즈시티뷰'),'sunrise cityview');
 const input=w.document.getElementById('from'),dest=w.document.getElementById('to');const a=w.RoutePlaceSearch.bind(input,p=>selected.push(p),()=>edits++),b=w.RoutePlaceSearch.bind(dest,p=>selected.push(p),()=>edits++);
 input.value='선라이즈 시티뷰';a.search();assert.equal(predictions[0].request.input,'sunrise cityview');input.value='벤탄';a.search();predictions[0].resolve([{place_id:'old',description:'old query'}]);await tick();assert(!w.document.body.textContent.includes('old query'));
 predictions[1].resolve([]);await tick();w.document.querySelector('#fromResults button').click();await tick();assert.equal(selected[0].id,'ben');
 dest.value='선라이즈 시티뷰';b.search();predictions[2].resolve([{place_id:'sunrise',structured_formatting:{main_text:'Sunrise Cityview',secondary_text:'호치민 7군'}}]);await tick();assert.equal(selected.length,1,'search alone does not select or navigate');
 dest.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',cancelable:true}));dest.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',cancelable:true}));assert.equal(details[0].request.placeId,'sunrise');details[0].resolve({place_id:'sunrise',name:'Sunrise Cityview',formatted_address:'호치민 7군',geometry:{location:{lat:10.74,lng:106.7}}});await tick();assert.equal(selected[1].placeId,'sunrise');assert.equal(selected[1].lat,10.74);
 dest.value='new';dest.dispatchEvent(new w.Event('input'));assert.equal(edits,1);b.hide();w.close();
}console.log('PASS desktop/mobile endpoint search: Korean aliases, independent origins/destinations, confirmation, keyboard, stale response, edit invalidation');})();
