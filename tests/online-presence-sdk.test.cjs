// Exercise the shipped SDK + page script against a deterministic Phoenix wire fixture.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const peers=new Set(),windows=[];let serial=0;
function state(){const s={};for(const p of peers)if(p.tracked)(s[p.key]??={metas:[]}).metas.push({online:true,phx_ref:p.id});return s}
function broadcast(){const payload=state();for(const p of peers)if(p.topic)p.receive('presence_state',payload)}
class Socket{
 static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
 constructor(url){this.url=url;this.readyState=0;this.id='socket-'+(++serial);peers.add(this);queueMicrotask(()=>{if(this.readyState!==0)return;this.readyState=1;this.onopen?.({})})}
 receive(event,payload,ref=null){queueMicrotask(()=>{if(this.readyState===1)this.onmessage?.({data:JSON.stringify([this.joinRef,ref,this.topic,event,payload])})})}
 send(raw){
  const [joinRef,ref,topic,event,payload]=JSON.parse(raw);
  if(event==='phx_join'){this.joinRef=joinRef;this.topic=topic;this.key=payload.config.presence.key;this.receive('phx_reply',{status:'ok',response:{postgres_changes:[]}},ref);this.receive('presence_state',state())}
  else if(event==='presence'){
   this.tracked=payload.event==='track';this.receive('phx_reply',{status:'ok',response:{}},ref);broadcast();
  }else if(event==='phx_leave'){this.tracked=false;this.receive('phx_reply',{status:'ok',response:{}},ref);broadcast()}
  else if(event==='heartbeat')this.receive('phx_reply',{status:'ok',response:{}},ref);
 }
 close(){if(this.readyState===3)return;this.readyState=3;peers.delete(this);this.onclose?.({code:1000});broadcast()}
}
function open(storage){
 const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'}),w=dom.window;
 windows.push(w);w.WebSocket=Socket;w.SUPABASE_URL='https://example.supabase.co';w.SUPABASE_HEADERS={apikey:'public-test-key'};
 Object.defineProperty(w,'localStorage',{value:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 vm.runInContext(read('assets/vendor/realtime-2.116.0.min.js'),dom.getInternalVMContext());
 vm.runInContext(read('assets/js/online-presence.js'),dom.getInternalVMContext());
 return {w,count:()=>w.document.getElementById('onlineUsers').textContent,close:()=>w.dispatchEvent(new w.Event('pagehide'))};
}
async function settle(){for(let n=0;n<12;n++)await new Promise(r=>setImmediate(r))}
(async()=>{
 try{
  const storage=new Map(),a=open(storage);await settle();assert.equal(a.count(),'1');
  const secondTab=open(storage);await settle();assert.equal(a.count(),'1');assert.equal(secondTab.count(),'1');
  const b=open(new Map());await settle();assert.equal(a.count(),'2');assert.equal(b.count(),'2');
  secondTab.close();await settle();assert.equal(a.count(),'2');b.close();await settle();assert.equal(a.count(),'1');
  a.close();await settle();assert.equal(peers.size,0);
  console.log('PASS shipped Realtime SDK browser bundle, protocol subscription/tracking, multi-tab deduplication and departure sync');
 }finally{for(const w of windows)w.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
