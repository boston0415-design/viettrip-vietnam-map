const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const context=vm.createContext({console,assert,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise,requestAnimationFrame:fn=>fn()});
context.window=context;
context.document={addEventListener(){},querySelector(){return {value:'',classList:{toggle(){},add(){},remove(){}}}},querySelectorAll(){return []}};
for(const file of fs.readdirSync(root).filter(f=>/^(0[1-8]|10)-/.test(f)&&f.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
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
const start=events.indexOf("document.querySelectorAll('[data-rating-filter]').forEach");
const end=events.indexOf('\nrenderRatingFilterState();',start);
vm.runInContext(events.slice(start,end),context);
(async()=>{
 await run('clickRating()');
 run(`assert.equal(state.ratingFilter,'4.5');assert.equal(JSON.stringify([state.city,state.cat,state.sub,state.navCategory,state.query,state.selectedNavItem,state.restaurantTag,state.rangeSelectionKey,state.benefitFilter]),before);`);
 await run('clickRating()');
 run(`assert.equal(state.ratingFilter,'all');assert.equal(JSON.stringify([state.city,state.cat,state.sub,state.navCategory,state.query,state.selectedNavItem,state.restaurantTag,state.rangeSelectionKey,state.benefitFilter]),before);console.log('PASS rating scope categories:',checks,'; search, coordinates, click/toggle preservation');`);
})().catch(e=>{console.error(e);process.exitCode=1});
