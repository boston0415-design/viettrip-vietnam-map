// Entirely offline: applying/cancelling shared filters must not write user data.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
for(const mobile of [false,true]){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test',runScripts:'outside-only'});
 const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.assert=assert;
 w.matchMedia=()=>({matches:mobile});w.requestAnimationFrame=()=>0;w.setTimeout=()=>0;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 for(const name of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(fs.readFileSync('assets/js/'+name,'utf8'));
 const entry=w.document.createElement('button');entry.id='listSharedFilters';w.document.body.append(entry);
 run(`
 const fixture={places:[
 {id:'pho',name:'Phở Thìn Mỹ Đình',category:'restaurant',subcategory:'베트남',area:'하노이',address:'Mỹ Đình Hà Nội',lat:21.029,lng:105.79,initialRating:5,memberBenefit:true},
 {id:'coffee',name:'호치민 커피',category:'cafe',subcategory:'카페',area:'호치민',address:'호치민',lat:10.77,lng:106.7,initialRating:4},
 {id:'hidden',name:'숨김 식당',category:'restaurant',subcategory:'베트남',area:'하노이',lat:21.03,lng:105.79,initialRating:5,memberBenefit:true},
 {id:'low',name:'보통 식당',category:'restaurant',subcategory:'베트남',area:'하노이',lat:21.03,lng:105.79,initialRating:3},
 ],reviews:[{id:'keep',placeId:'pho',text:'원문 보존',rating:5,recommended:true}]};
 db=()=>fixture;state.city='all';state.cat='all';state.sub='all';state.query='';state.ratingFilter='all';state.benefitFilter='all';state.restaurantTag='all';state.sharedDbLoading=false;
 window.PersonalPlaces={isHidden:id=>id==='hidden',getView:()=> 'all',setView:()=>{},filter:rows=>rows.filter(p=>p.id!=='hidden')};
 cancelPendingMapWork=()=>{};renderAll=()=>{window.BrowseExperience?.sync()};renderHierarchyNav=()=>{};renderCityControls=()=>{};closeDetailPanel=()=>{state.selected=null};
 `);
 run(fs.readFileSync('assets/js/browse-experience.js','utf8'));
 const el=id=>w.document.getElementById(id),change=(id,v)=>{el(id).value=v;el(id).dispatchEvent(new w.Event('change',{bubbles:true}))};
 const before=run('JSON.stringify(fixture)');w.BrowseExperience.open('category');change('browseCategory','restaurant');change('browseRating','4plus');change('browseBenefit','benefit');change('browseQuery','pho thin my dinh');
 assert.equal(el('browseApply').textContent,'1곳 보기','Vietnamese accents and split names resolve to the original place');
 el('browseFilterClose').click();assert.equal(run('state.cat'),'all','cancel is non-mutating');assert.equal(run('state.query'),'');
 w.BrowseExperience.open();change('browseCategory','restaurant');change('browseRating','4plus');change('browseBenefit','benefit');change('browseQuery','pho thin my dinh');
 el('browseFilterForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(run('items().map(p=>p.id).join()'),'pho');assert.equal(el('browseShowList').textContent,'업소 목록 1곳');assert.equal(run('state.ratingFilter'),'4plus');assert(!el('browseFilterDialog').open);
 assert.equal(run('matchesRatingFilter(4.3,"4plus")'),true);assert.equal(run('matchesRatingFilter(3.9,"4plus")'),false);assert.equal(run('matchesRatingFilter(null,"4plus")'),false);
 w.BrowseExperience.open();change('browseQuery','없는 업소');assert.equal(el('browseApply').textContent,'0곳 보기');assert.match(el('browsePreview').textContent,/조건을 넓혀/);el('browseFilterClose').click();assert.equal(run('items().length'),1);
 el('browseClear').click();assert.equal(run('items().length'),3);assert.equal(run('JSON.stringify(fixture)'),before,'browse operations never change reviews or places');
 assert.equal(w.document.querySelectorAll('[data-browse-filter]').length,3);
 assert.equal(w.document.querySelectorAll('.mapwrap [data-browse-filter]').length,0,'selectors never cover the map');
 assert.equal(w.document.querySelectorAll('#businessSide [data-browse-filter]').length,3,'selectors are inside the list');
 assert.equal(w.document.querySelectorAll('.top #adminBtn').length,0,'operator control is not in the header');
 const quick=w.document.querySelector('[data-browse-filter="category"]');quick.value='restaurant';quick.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(run('state.cat'),'restaurant');assert.equal(run('items().length'),2,'quick category applies without opening a form');assert(!el('browseFilterDialog').open);
 const tabs=w.document.querySelector('.browseListTabs');assert.equal(tabs.previousElementSibling.className,'mobileSideHead');assert(!tabs.closest('.filters'),'primary tabs never live in hidden options');
 tabs.querySelector('[data-benefit-filter="recommended"]').click();assert.equal(run('items().map(p=>p.id).join()'),'pho');
 tabs.querySelector('[data-benefit-filter="recommended"]').click();assert.equal(run('state.benefitFilter'),'recommended','selected tab stays selected');
 assert.equal(tabs.querySelector('[data-benefit-filter="recommended"]').getAttribute('aria-pressed'),'true');
 tabs.querySelector('[data-benefit-filter="all"]').click();assert.equal(run('items().length'),2);assert.equal(run('state.cat'),'restaurant','tabs preserve region/category conditions');
 tabs.querySelector('[data-benefit-filter="benefit"]').click();assert.equal(run('items().map(p=>p.id).join()'),'pho');
 el('browseShowList').click();assert(!el('browseFilterDialog').open,'list entry immediately shows the list');
 assert.equal(run('JSON.stringify(fixture)'),before,'direct choices preserve review and place data');
 dom.window.close();
}
console.log('PASS shared filters: draft isolation, cancelled/zero results, combined rating-benefit-name matching, accent search, hidden exclusions, reset and no data writes in desktop/mobile DOM');
