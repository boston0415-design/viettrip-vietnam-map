const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'assets/js/online-presence.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const clients=[],windows=[],rooms=new Set();
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
function sync(){for(const room of rooms)room.sync?.()}
class RealtimeClient{
 constructor(url,options){this.options=options;this.rooms=[];clients.push(this)}
 channel(topic,options){
  const room={id:options.config.presence.key,meta:null,tracked:0,closed:false,
   on:(type,filter,fn)=>{room.sync=fn;return room},
   subscribe:fn=>{room.status=fn;rooms.add(room);queueMicrotask(()=>fn('SUBSCRIBED'));return room},
   track:async meta=>{room.tracked++;room.meta=meta;sync();return 'ok'},
   presenceState:()=>{const state={};for(const r of rooms){if(r.meta)(state[r.id]??=[]).push(r.meta)}return state}
  };this.rooms.push(room);return room;
 }
 async removeAllChannels(){for(const r of this.rooms){rooms.delete(r);r.closed=true;r.status?.('CLOSED')}sync()}
 async disconnect(){return this.removeAllChannels()}
}
function open({storage=new Map(),blocked=false,missing=false,host='viettrip-vietnam-map.pages.dev',locks=false}={}){
 const dom=new JSDOM(html,{url:'https://'+host,runScripts:'outside-only'}),w=dom.window;
 windows.push(w);w.SUPABASE_URL='https://example.supabase.co';w.SUPABASE_HEADERS={apikey:'public-test-key'};
 w.ViettripRealtime=missing?undefined:{RealtimeClient};let online=true;Object.defineProperty(w.navigator,'onLine',{get:()=>online});
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
 Object.defineProperty(w,'localStorage',{value:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v)}}});
 if(locks)w.navigator.locks={request:async(key,fn)=>fn()};
 let timeouts=[];w.setTimeout=fn=>{timeouts.push(fn);return timeouts.length};w.clearTimeout=id=>{timeouts[id-1]=null};
 w.eval(code);
 return {w,node:w.document.getElementById('onlineUsers'),badge:w.document.querySelector('.onlineStat'),storage,
  offline:()=>{online=false;w.dispatchEvent(new w.Event('offline'))},online:()=>{online=true;w.dispatchEvent(new w.Event('online'))},
  retry:()=>{const next=timeouts.filter(Boolean);timeouts=[];next.forEach(fn=>fn())},
  pagehide:()=>w.dispatchEvent(new w.Event('pagehide')),pageshow:()=>w.dispatchEvent(new w.Event('pageshow'))};
}
(async()=>{
 try{
  const shared=new Map(),a=open({storage:shared,locks:true});await tick();assert.equal(a.node.textContent,'1');
  assert.equal(a.badge.nextElementSibling.querySelector('b').id,'totalVisits','online count precedes cumulative visits');
  assert.equal(a.badge.dataset.status,'online');
  const aTab=open({storage:shared});await tick();assert.equal(a.node.textContent,'1');assert.equal(aTab.node.textContent,'1');
  const b=open();await tick();assert.equal(a.node.textContent,'2');assert.equal(b.node.textContent,'2');
  assert(clients.every(c=>c.rooms.every(r=>Object.keys(r.meta).join()==='online')),'no owner IDs, nicknames or profile data in presence');
  aTab.pagehide();await tick();assert.equal(a.node.textContent,'2','closing one of two same-browser tabs does not remove the browser');
  b.offline();await tick();assert.equal(a.node.textContent,'1');assert.equal(b.node.textContent,'—');
  b.online();await tick();assert.equal(a.node.textContent,'2');assert.equal(b.node.textContent,'2');
  b.pagehide();await tick();assert.equal(a.node.textContent,'1');b.pageshow();await tick();assert.equal(a.node.textContent,'2','BFCache restores presence');
  const current=clients.at(-1),oldRoom=current.rooms[0];oldRoom.status('CHANNEL_ERROR');
  assert.equal(b.node.textContent,'—','failed connections do not show stale counts or a fake zero');b.retry();await tick();assert.equal(b.node.textContent,'2');
  oldRoom.status('SUBSCRIBED');await tick();assert.equal(oldRoom.tracked,1,'callbacks from old connections cannot revive exited presence');
  const heartbeat=clients.at(-1);heartbeat.options.heartbeatCallback('timeout');assert.equal(b.node.textContent,'—');b.retry();await tick();assert.equal(b.node.textContent,'2');
  const blocked=open({blocked:true});await tick();assert.equal(blocked.node.textContent,'3');blocked.offline();blocked.online();await tick();assert.equal(blocked.node.textContent,'3');
  const before=clients.length;const preview=open({host:'preview.pages.dev'}),missing=open({missing:true});await tick();
  assert.equal(clients.length,before);assert.equal(preview.node.textContent,'—');assert.equal(missing.node.textContent,'—');
  const newKey=randomUUID();shared.set('viettrip_online_browser_v1',newKey);
  a.w.dispatchEvent(new a.w.StorageEvent('storage',{key:'viettrip_online_browser_v1',newValue:newKey}));await tick();assert.equal(a.node.textContent,'3');
  assert.equal(clients.at(-1).rooms[0].id,newKey,'storage events reconcile racing first tabs');
  a.pagehide();b.pagehide();blocked.pagehide();await tick();assert.equal(rooms.size,0);
  console.log('PASS online count placement, tab deduplication, joins/leaves, offline recovery, BFCache, heartbeat failure, stale callbacks, storage fallback and preview exclusion');
 }finally{windows.forEach(w=>w.close())}
})().catch(e=>{console.error(e);process.exitCode=1});
