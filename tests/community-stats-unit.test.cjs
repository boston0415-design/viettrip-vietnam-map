const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/community-stats.js'),'utf8');
const sessions=new Map(),visits=new Set();let serial=0;
async function load({fail=false,blocked=false,host='viettrip-vietnam-map.pages.dev'}={}){
 const nodes=Object.fromEntries(['totalVisits','totalPlaces','totalReviews'].map(k=>[k,{textContent:'—'}]));
 const context={Intl,AbortController,setTimeout,clearTimeout,SUPABASE_URL:'https://test.invalid',SUPABASE_HEADERS:{},location:{hostname:host},crypto:{randomUUID:()=>String(++serial)},sessionStorage:{getItem:k=>{if(blocked)throw Error('blocked');return sessions.get(k)},setItem:(k,v)=>sessions.set(k,v)},document:{getElementById:k=>nodes[k]},fetch:async(url,options)=>{
  if(fail)throw Error('offline');
  if(options.method==='POST'){
   const id=JSON.parse(options.body).id,duplicate=visits.has(id);visits.add(id);
   return {ok:!duplicate,status:duplicate?409:201};
  }
  return {ok:true,headers:{get:()=> '*/'+(url.includes('site_visits')?visits.size:url.includes('places_public')?1234:5678)}};
 }};
 await vm.runInNewContext(code,context);await new Promise(resolve=>setImmediate(resolve));return nodes;
}
(async()=>{
 let result=await load();assert.equal(result.totalVisits.textContent,'1');assert.equal(result.totalPlaces.textContent,'1,234');assert.equal(result.totalReviews.textContent,'5,678');
 await load();assert.equal(visits.size,1,'reload uses same token');
 sessions.clear();result=await load();assert.equal(result.totalVisits.textContent,'2','new session counts');
 result=await load({blocked:true});assert.equal(result.totalVisits.textContent,'2','blocked storage never inflates');
 sessions.clear();await load({host:'preview.pages.dev'});assert.equal(visits.size,2,'previews excluded');
 result=await load({fail:true});assert.equal(result.totalVisits.textContent,'—');assert.equal(result.totalPlaces.textContent,'—');
 console.log('PASS statistics: exact totals, reload deduplication, new session, blocked storage, previews, network failure');
})().catch(e=>{console.error(e);process.exitCode=1});
