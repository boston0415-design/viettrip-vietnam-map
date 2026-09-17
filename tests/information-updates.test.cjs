const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js'),storage=new Map();
const c=vm.createContext({console,assert,URL,Set,Map,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});c.window=c;
c.document={addEventListener(){},querySelector(){return {}},querySelectorAll(){return []}};
for(const f of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(root,'personal-places.js'),'utf8'),c);
vm.runInContext(`
const places=[{id:'hcm',name:'호치민 호텔',category:'stay',subcategory:'호텔',area:'호치민',...CITY_DATA.hcmc.center},{id:'han',name:'하노이 환전',category:'exchange',subcategory:'환전소·금은방',area:'하노이',...CITY_DATA.hanoi.center}];
db=()=>({places,reviews:[{id:'r1',placeId:'hcm',rating:4,text:''},{id:'r2',placeId:'hcm',rating:null,text:'글만 작성'},{id:'r3',placeId:'hcm',rating:5,text:'별점과 글'}]});
assert.equal(stats('hcm').count,2);assert.equal(stats('hcm').reviews.length,2);
PersonalPlaces.toggleHidden('han');PersonalPlaces.setView('hidden');
Object.assign(state,{city:'hcmc',cat:'stay',sub:'호텔',navCategory:'stay',query:'없는 검색',ratingFilter:'5',benefitFilter:'benefit'});
const before=JSON.stringify(state);
assert.deepEqual(Array.from(items({forList:true}),p=>p.id),['han'],'hidden management must span all cities and active filters');
assert.equal(items().length,0,'hidden map markers remain excluded');assert.equal(JSON.stringify(state),before,'opening hidden management must not reset filters');
PersonalPlaces.toggleHidden('han');assert.equal(items({forList:true}).length,0,'restored business leaves hidden management');
PersonalPlaces.setView('all');assert.equal(items({forList:true}).length,0,'normal list still respects the original filters');
console.log('PASS written review counts vs ratings and global hidden management with preserved filters');
`,c);
