// Anonymous, ephemeral Realtime presence. No database writes or Maps API calls.
(()=>{
  const count=document.getElementById('onlineUsers');
  if(!count || location.hostname!=='viettrip-vietnam-map.pages.dev')return;
  const badge=count.closest('.onlineStat');
  const KEY='viettrip_online_browser_v1';
  const valid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const format=new Intl.NumberFormat('ko-KR');
  let client=null,channel=null,identity=null,generation=0,starting=false,ready=false;
  let suspended=false,retryTimer=null,retryDelay=3000;
  function display(value,status){
    count.textContent=value==null?'—':format.format(value);
    badge.dataset.status=status;
    badge.setAttribute('aria-label',value==null?'실시간 접속자 수 확인 중':`실시간 접속 ${format.format(value)}명`);
  }
  function browserIdentity(){
    for(const getStorage of [()=>localStorage,()=>sessionStorage]){
      try{
        const storage=getStorage(),saved=storage.getItem(KEY);
        if(valid(saved))return saved;
        const id=identity||crypto.randomUUID();
        storage.setItem(KEY,id);
        return storage.getItem(KEY)||id;
      }catch{}
    }
    return identity||crypto.randomUUID();
  }
  function stop(){
    generation++;starting=false;ready=false;
    clearTimeout(retryTimer);retryTimer=null;
    const old=client;client=null;channel=null;
    if(old){
      // Teardown also clears channel rejoin timers; close the socket immediately on exit.
      Promise.resolve(old.removeAllChannels()).catch(()=>{});
      Promise.resolve(old.disconnect()).catch(()=>{});
    }
    display(null,'unavailable');
  }
  function retry(){
    if(retryTimer || suspended || navigator.onLine===false)return;
    retryTimer=setTimeout(()=>{retryTimer=null;stop();start()},retryDelay);
    retryDelay=Math.min(retryDelay*2,30000);
  }
  function paint(){
    if(!ready || !channel)return;
    const state=channel.presenceState();
    const active=Object.keys(state).filter(key=>valid(key)&&state[key].some(item=>item.online===true));
    // Never present a disconnected or not-yet-synchronized channel as zero visitors.
    if(!active.includes(identity)){display(null,'connecting');return}
    display(active.length,'online');
  }
  async function start(){
    if(client || starting || suspended || navigator.onLine===false)return;
    if(!window.ViettripRealtime?.RealtimeClient){display(null,'unavailable');return}
    const revision=++generation;starting=true;display(null,'connecting');
    try{
      // A separate random key: never expose the registration owner token or nickname.
      const id=navigator.locks?.request
        ?await navigator.locks.request(KEY,browserIdentity):browserIdentity();
      if(revision!==generation)return;
      identity=id;
      const current=new window.ViettripRealtime.RealtimeClient(SUPABASE_URL.replace(/^http/,'ws')+'/realtime/v1',{
        params:{apikey:SUPABASE_HEADERS.apikey},
        heartbeatCallback:status=>{
          if(revision===generation && ['error','timeout','disconnected'].includes(status)){
            ready=false;display(null,'unavailable');retry();
          }
        }
      });
      client=current;starting=false;
      const room=current.channel('viettrip-online-v1',{config:{presence:{key:id},broadcast:{self:false},private:false}});
      channel=room;
      room.on('presence',{event:'sync'},()=>{if(revision===generation)paint()});
      room.subscribe(async status=>{
        if(revision!==generation)return;
        if(status==='SUBSCRIBED'){
          try{
            const result=await room.track({online:true});
            if(revision!==generation)return;
            if(result!=='ok')throw new Error('Presence tracking unavailable');
            clearTimeout(retryTimer);retryTimer=null;retryDelay=3000;ready=true;paint();
          }catch{if(revision===generation){ready=false;display(null,'unavailable');retry()}}
        }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
          ready=false;display(null,'unavailable');retry();
        }
      });
    }catch{if(revision===generation){stop();retry()}}
  }
  window.addEventListener('offline',stop);
  window.addEventListener('online',()=>{stop();start()});
  window.addEventListener('pagehide',()=>{suspended=true;stop()});
  window.addEventListener('pageshow',()=>{suspended=false;start()});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && !suspended && !ready){stop();start()}
  });
  // Converge simultaneous first tabs even on browsers without Web Locks.
  window.addEventListener('storage',event=>{
    if(event.key===KEY && valid(event.newValue) && event.newValue!==identity){stop();start()}
  });
  start();
})();
