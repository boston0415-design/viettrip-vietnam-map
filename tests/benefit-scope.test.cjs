const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const context=vm.createContext({console,assert,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise,requestAnimationFrame:fn=>fn()});
context.window=context;
context.document={addEventListener(){},querySelector(){return {value:'',classList:{toggle(){},add(){},remove(){}}}},querySelectorAll(){return []}};
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')&&!f.startsWith('09-')).sort())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const run=code=>vm.runInContext(code,context);
run(`
let fixtures=[];
db=()=>({places:fixtures,reviews:[]});
stats=id=>({rating:fixtures.find(p=>p.id===id).score,count:1});
setDbStatus=()=>{};closeSystemInfo=()=>{};
renderRatingFilterState=()=>{};renderHierarchyNav=()=>{};renderAll=()=>{};
fitSelectedCityView=()=>{throw Error('rating must not reset city view')};
function reset(){Object.assign(state,{city:'hcmc',navCategory:null,selectedNavItem:null,cat:'all',sub:'all',query:'',restaurantTag:'all',ratingFilter:'all',benefitFilter:'all',selected:null,map:null});}
function place(id,category,score,city='hcmc'){return {id,name:id,category,subcategory:CONFIG.categories[category].subs[0],score,...CITY_DATA[city].center};}
let checks=0;
for(const cat of Object.keys(CONFIG.categories)){
 reset();state.cat=cat;
 fixtures=[place('match',cat,4.7),place('low',cat,3),place('other-city',cat,4.7,'hanoi')];
 for(const other of Object.keys(CONFIG.categories).filter(c=>c!==cat))fixtures.push(place(other,other,4.7));
 state.ratingFilter='4.5';
 assert.deepEqual(items().map(p=>p.id),['match']);
 assert.deepEqual(ratingFilterPlaces().map(p=>p.id),['match']);
 assert.equal(ratingFilterPlaces('all').length,2);
 checks++;
}
reset();
const cat=Object.keys(CONFIG.categories)[0];
state.cat=cat;state.sub=CONFIG.categories[cat].subs[0];state.query='match';
fixtures=[place('match',cat,4.7),place('excluded by search',cat,4.7)];
state.ratingFilter='4.5';assert.deepEqual(ratingFilterPlaces().map(p=>p.id),['match']);
fixtures[0].lat=null;assert.equal(ratingFilterPlaces().length,0);
reset();fixtures=[place('match',cat,4.7)];
state.cat=cat;state.sub=CONFIG.categories[cat].subs[0];state.navCategory=cat;
state.query='match';state.rangeSelectionKey='business:hcmc:'+cat;
state.selectedNavItem='preserve-selection';state.restaurantTag='preserve-tag';
const before=JSON.stringify([state.city,state.cat,state.sub,state.navCategory,state.query,state.selectedNavItem,state.restaurantTag,state.rangeSelectionKey,state.benefitFilter]);
let clickRating;
document.querySelectorAll=()=>[{dataset:{ratingFilter:'4.5'},addEventListener:(type,fn)=>{clickRating=fn}}];
`);
const events=fs.readFileSync(path.join(root,'09-init-events.js'),'utf8');
run(`
reset();state.cat='stay';state.sub=CONFIG.categories.stay.subs[0];state.ratingFilter='4.5';state.query='match';
fixtures=[place('match','stay',4.7),place('match-low','stay',3),place('match-other','restaurant',4.7),place('match-city','stay',4.7,'hanoi')];
fixtures.forEach(p=>p.memberBenefit=true);
let clickBenefit;document.querySelectorAll=()=>[{dataset:{benefitFilter:'benefit'},addEventListener:(type,fn)=>{clickBenefit=fn}}];
fitSelectedCityView=()=>{};
`);
const start=events.indexOf("document.querySelectorAll('[data-benefit-filter]').forEach");
const end=events.indexOf("\n$('#pName')",start);
vm.runInContext(events.slice(start,end),context);
(async()=>{
 await run('clickBenefit()');
 run(`assert.equal(state.cat,'stay');assert.equal(state.sub,CONFIG.categories.stay.subs[0]);assert.equal(state.query,'match');assert.equal(state.ratingFilter,'4.5');assert.deepEqual(benefitFilterPlaces().map(p=>p.id),['match']);`);
 await run('clickBenefit()');
 run(`assert.equal(state.benefitFilter,'all');assert.equal(state.cat,'stay');assert.equal(state.ratingFilter,'4.5');assert.equal(state.query,'match');console.log('PASS discount filter preserves city/category/subcategory/rating/search and map results match list');`);
})().catch(e=>{console.error(e);process.exitCode=1});
