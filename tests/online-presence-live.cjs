// Uses an isolated, ephemeral topic: no production count or database rows are changed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {RealtimeClient}=require('../scripts/presence-sdk/node_modules/@supabase/realtime-js');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/01-data-storage.js'),'utf8');
const url=source.match(/const SUPABASE_URL='([^']+)'/)[1];
const key=source.match(/const SUPABASE_ANON='([^']+)'/)[1];
const topic='viettrip-online-qa-'+randomUUID(),clients=[];
async function join(identity){
 const client=new RealtimeClient(url.replace(/^http/,'ws')+'/realtime/v1',{params:{apikey:key}});clients.push(client);
 const room=client.channel(topic,{config:{presence:{key:identity},private:false}});
 room.on('presence',{event:'sync'},()=>{});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Presence subscription timed out')),15000);
  room.subscribe(status=>{
   if(status==='SUBSCRIBED'){clearTimeout(timer);resolve()}
   if(['CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);reject(Error('Presence subscription failed: '+status))}
  });
 });
 assert.equal(await room.track({online:true}),'ok');
 return {client,room};
}
async function waitCount(room,n){
 const end=Date.now()+12000;
 while(Date.now()<end){
  if(Object.values(room.presenceState()).filter(items=>items.some(p=>p.online)).length===n)return;
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 throw Error('Presence count did not reach '+n);
}
(async()=>{
 try{
  const browserA=randomUUID(),a=await join(browserA);await waitCount(a.room,1);
  const same=await join(browserA);await waitCount(a.room,1);
  const b=await join(randomUUID());await waitCount(a.room,2);
  await same.client.removeAllChannels();await waitCount(a.room,2);
  await b.client.removeAllChannels();await waitCount(a.room,1);
  console.log('PASS live Supabase presence joins, shared-browser keys, distinct visitors and disconnect removal');
 }finally{await Promise.allSettled(clients.map(c=>c.removeAllChannels()));await Promise.allSettled(clients.map(c=>c.disconnect()))}
})().catch(error=>{console.error(error.message);process.exitCode=1});
