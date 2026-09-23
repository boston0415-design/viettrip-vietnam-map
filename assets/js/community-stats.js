// Isolated from map/filter state. No polling, IP collection or device fingerprint.
(()=>{
  const format=new Intl.NumberFormat('ko-KR');
  const endpoint=SUPABASE_URL+'/rest/v1/';
  // Our stated rule, not a claim about Naver's internal counting algorithm.
  const VISIT_WINDOW_MS=30*60*1000;
  const VISIT_KEY='viettrip_counted_visit_v2';
  let visitToken,visitRecorded=false,roleRevision=0,loading=null;
  function reuseVisitToken(){
    if(visitToken)return visitToken;
    let storage;
    try{storage=localStorage;storage.getItem(VISIT_KEY)}catch{try{storage=sessionStorage;storage.getItem(VISIT_KEY)}catch{storage=null}}
    const now=Date.now();
    try{
      const previous=JSON.parse(storage?.getItem(VISIT_KEY)||'null');
      if(previous&&typeof previous.id==='string'&&/^[0-9a-f-]{36}$/i.test(previous.id)&&previous.expires>now&&previous.expires<=now+VISIT_WINDOW_MS){
        visitRecorded=previous.recorded===true;
        return visitToken=previous.id;
      }
    }catch{}
    visitToken=crypto.randomUUID();
    // Keep the same token on a failed request so a retry never double-counts.
    try{storage?.setItem(VISIT_KEY,JSON.stringify({id:visitToken,expires:now+VISIT_WINDOW_MS}))}catch{}
    return visitToken;
  }
  async function request(path,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{return await fetch(endpoint+path,{...options,signal:controller.signal,headers:{...SUPABASE_HEADERS,...options.headers}})}
    finally{clearTimeout(timer)}
  }
  async function count(path,id,version){
    const response=await request(path,{method:'HEAD',headers:{Prefer:'count=exact'}});
    if(!response.ok)throw new Error('Statistics unavailable');
    const raw=response.headers.get('content-range')?.split('/').pop();
    if(!raw||!/^\d+$/.test(raw))throw new Error('Invalid statistics');
    const node=document.getElementById(id);
    if(node&&state.isAdmin&&version===roleRevision)node.textContent=format.format(Number(raw));
  }
  async function recordVisit(){
    // Count only the production domain; previews and local checks do not inflate totals.
    if(location.hostname!=='viettrip-vietnam-map.pages.dev')return;
    const getToken=()=>reuseVisitToken();
    const id=typeof navigator!=='undefined'&&navigator.locks?.request
      ?await navigator.locks.request(VISIT_KEY,getToken):getToken();
    if(visitRecorded)return;
    const response=await request('site_visits',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id})});
    if(!response.ok&&response.status!==409)throw new Error('Visit not recorded');
    visitRecorded=true;
    for(const getStore of [()=>localStorage,()=>sessionStorage]){
      try{
        const storage=getStore(),saved=JSON.parse(storage.getItem(VISIT_KEY)||'null');
        if(saved?.id===id)storage.setItem(VISIT_KEY,JSON.stringify({...saved,recorded:true}));
      }catch{}
    }
  }
  // Anonymous visits are still counted. Aggregate requests are only made in operator mode.
  const visitReady=recordVisit().catch(()=>{});
  function syncRole(){
    const allowed=state.isAdmin===true;
    document.querySelectorAll('.communityStats>span').forEach(node=>{node.hidden=!allowed;});
    if(!allowed){roleRevision++;loading=null;for(const id of ['totalVisits','totalPlaces','totalReviews']){const node=document.getElementById(id);if(node)node.textContent='—';}return;}
    if(loading)return;
    const version=++roleRevision;
    loading=Promise.allSettled([
      visitReady.then(()=>{if(state.isAdmin&&version===roleRevision)return count('site_visits?select=created_at&limit=0','totalVisits',version);}),
      count('places_public?select=id&limit=0','totalPlaces',version),
      count('reviews?select=id&body=not.is.null&body=neq.&limit=0','totalReviews',version)
    ]).finally(()=>{if(version===roleRevision)loading=null;});
  }
  window.CommunityStats={syncRole};syncRole();
})();
