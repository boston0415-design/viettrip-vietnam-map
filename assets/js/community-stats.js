// Isolated from map/filter state. No polling, IP collection or device fingerprint.
(()=>{
  const format=new Intl.NumberFormat('ko-KR');
  const endpoint=SUPABASE_URL+'/rest/v1/';
  const storageKey='viettrip_visit_session_v1';
  async function request(path,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{return await fetch(endpoint+path,{...options,signal:controller.signal,headers:{...SUPABASE_HEADERS,...options.headers}})}
    finally{clearTimeout(timer)}
  }
  async function count(path,id){
    const response=await request(path,{method:'HEAD',headers:{Prefer:'count=exact'}});
    if(!response.ok)throw new Error('Statistics unavailable');
    const raw=response.headers.get('content-range')?.split('/').pop();
    if(!raw||!/^\d+$/.test(raw))throw new Error('Invalid statistics');
    const node=document.getElementById(id);
    if(node)node.textContent=format.format(Number(raw));
  }
  async function recordVisit(){
    // Count only the production domain; previews and local checks do not inflate totals.
    if(location.hostname!=='viettrip-vietnam-map.pages.dev')return;
    let token;
    try{
      token=sessionStorage.getItem(storageKey);
      if(!token){token=crypto.randomUUID();sessionStorage.setItem(storageKey,token)}
    }catch{return} // If persistent session storage is blocked, don't count reloads repeatedly.
    const response=await request('site_visits',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:token})});
    if(!response.ok&&response.status!==409)throw new Error('Visit not recorded');
  }
  async function visits(){
    try{await recordVisit()}catch{} // Failed recording must not hide the existing total.
    await count('site_visits?select=created_at&limit=0','totalVisits');
  }
  Promise.allSettled([
    visits(),
    count('places_public?select=id&limit=0','totalPlaces'),
    count('reviews?select=id&body=not.is.null&body=neq.&limit=0','totalReviews')
  ]);
})();
