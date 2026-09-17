const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/personal-places.js'),'utf8');
const key='viettrip_personal_places_v1',places=[{id:'a'},{id:'b'},{id:'c'}];
function make(storage=new Map(),unavailable=false){
 const context={Set,console,document:{addEventListener(){}},localStorage:{getItem:k=>{if(unavailable)throw Error('unavailable');return storage.get(k)||null},setItem:(k,v)=>{if(unavailable)throw Error('unavailable');storage.set(k,v)}}};
 context.window=context;vm.runInNewContext(source,context);return context.PersonalPlaces;
}
const ids=rows=>Array.from(rows,p=>p.id);
const storage=new Map(),one=make(storage);
assert.equal(one.toggleFavorite('a').saved,true);assert(one.isFavorite('a'));
one.setView('favorites');assert.deepEqual(ids(one.filter(places)),['a']);
const reload=make(storage);assert(reload.isFavorite('a'),'favorites survive reload');
assert(!make().isFavorite('a'),'another browser has independent choices');
assert.equal(one.toggleHidden('a').saved,true);assert.deepEqual(ids(one.filter(places)),[]);
one.setView('hidden');assert.deepEqual(ids(one.filter(places,true)),['a']);assert.deepEqual(ids(one.filter(places)),[],'hidden places never render on the map');
assert(make(storage).isHidden('a'),'hidden choices survive reload');
one.toggleHidden('a');one.setView('favorites');assert.deepEqual(ids(one.filter(places)),['a'],'restoring does not erase the favorite');
// Updating another tab merges the most recent stored choices.
reload.toggleFavorite('b');one.toggleFavorite('c');
assert.deepEqual(ids(make(storage).filter(places)),['a','b','c']);
const merged=make(storage);merged.setView('favorites');assert.deepEqual(ids(merged.filter(places)),['a','b','c']);
const isolated=make();isolated.setView('favorites');assert.deepEqual(ids(isolated.filter(places)),[]);
const disabled=make(new Map(),true);assert.equal(disabled.toggleFavorite('a').saved,false);disabled.toggleFavorite('b');
disabled.setView('favorites');assert.deepEqual(ids(disabled.filter(places)),['a','b'],'unavailable storage still preserves this page session');
assert.equal(disabled.toggleFavorite(null).changed,false);
const invalid=make(new Map([[key,'{"favorites":[null,1,"a","a"],"hidden":{}}']]));invalid.setView('favorites');assert.deepEqual(ids(invalid.filter(places)),['a']);
assert.deepEqual(ids(make(new Map([[key,'bad JSON']])).filter(places)),['a','b','c']);
console.log('PASS personal favorites/hiding, reload persistence, isolated browsers, restore, map exclusion, concurrent tabs, unavailable/malformed storage');
