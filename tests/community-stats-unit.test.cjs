const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const code=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/community-stats.js'),'utf8');
const local=new Map(),session=new Map(),visits=new Set();let now=1e12;
async function load({fail=false,blocked=false,sessionBlocked=false,admin=true,host='viettrip-vietnam-map.pages.dev'}={}){
 const nodes=Object.fromEntries(['totalVisits','totalPlaces','totalReviews'].map(k=>[k,{textContent:'—'}]));
 const storage=(data,isBlocked)=>({getItem:k=>{if(isBlocked)throw Error('blocked');return data.get(k)},setItem:(k,v)=>{if(isBlocked)throw Error('blocked');data.set(k,v)}});
 let aggregateRequests=0;
 const context={Intl,AbortController,Date:{now:()=>now},setTimeout,clearTimeout,state:{isAdmin:admin},SUPABASE_URL:'https://test.invalid',SUPABASE_HEADERS:{},location:{hostname:host},crypto:{randomUUID},localStorage:storage(local,blocked),sessionStorage:storage(session,sessionBlocked),document:{getElementById:k=>nodes[k],querySelectorAll:()=>Object.values(nodes)},fetch:async(url,options)=>{
  if(fail)throw Error('offline');
  if(options.method==='POST'){
   const id=JSON.parse(options.body).id,duplicate=visits.has(id);visits.add(id);
   return {ok:!duplicate,status:duplicate?409:201};
  }
  aggregateRequests++;return {ok:true,headers:{get:()=> '*/'+(url.includes('site_visits')?visits.size:url.includes('places_public')?1234:5678)}};
 }};
 context.window=context;
 await vm.runInNewContext(code,context);await new Promise(resolve=>setImmediate(resolve));return {...nodes,aggregateRequests};
}
(async()=>{
 let result=await load();assert.equal(result.totalVisits.textContent,'1');assert.equal(result.totalPlaces.textContent,'1,234');assert.equal(result.totalReviews.textContent,'5,678');
 await load();assert.equal(visits.size,1,'refresh reuses the visit token');
 session.clear();await load();assert.equal(visits.size,1,'another tab reuses browser visit');
 now+=30*60*1000-1;await load();assert.equal(visits.size,1,'29:59 remains the same visit');
 now+=1;await load();assert.equal(visits.size,2,'new visit after 30 minutes');
 await load({blocked:true});await load({blocked:true});assert.equal(visits.size,3,'session storage fallback suppresses refresh');
 await load({blocked:true,sessionBlocked:true});assert.equal(visits.size,4,'fully blocked storage still loads stats');
 await load({host:'preview.pages.dev'});assert.equal(visits.size,4,'previews excluded');
 local.clear();result=await load({fail:true});assert.equal(result.totalVisits.textContent,'—');
 await load();await load();assert.equal(visits.size,5,'retry after failure counts exactly once');
 local.set('viettrip_counted_visit_v2','invalid JSON');await load();assert.equal(visits.size,6,'invalid cache recovers');
 result=await load({admin:false});assert.equal(result.aggregateRequests,0);assert.equal(result.totalVisits.textContent,'—');assert(result.totalReviews.hidden,'public counts are hidden');assert.equal(visits.size,6,'anonymous visit still deduplicates');
 console.log('PASS 30-minute visit window, reload/new-tab deduplication, storage fallback, preview exclusion and retry');
})().catch(e=>{console.error(e);process.exitCode=1});
