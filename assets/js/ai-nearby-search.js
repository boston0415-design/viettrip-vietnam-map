/* Query-local origins: never changes saved accommodation or community data. */
(() => {
  'use strict';
  const norm=s=>(window.NameSearch?.canonical(s)||String(s||'').toLowerCase()).replace(/(\d+)\s*군/g,'quan $1').replace(/\s+/g,' ').trim();
  const point=value=>{
    if(!value)return null;
    const lat=Number(typeof value.lat==='function'?value.lat():value.lat),lng=Number(typeof value.lng==='function'?value.lng():value.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=8&&lat<=24&&lng>=102&&lng<=110?{lat,lng}:null;
  };
  const distanceLabel=meters=>meters<1000?Math.round(meters/10)*10+'m':(meters/1000).toFixed(1).replace(/\.0$/,'')+'km';
  function origin(place,ref,kind='named'){
    const pos=point(place.position||place);if(!pos)return null;
    return {...pos,name:place.name||ref.anchor||'선택한 위치',radius:ref.radius||2000,kind,placeId:place.id||place.placeId||'',address:place.address||''};
  }
  function candidates(places,name,city){
    name=name.replace(/호치민|ho\s*chi\s*minh(?:\s*city)?|하노이|ha\s*noi|다낭|da\s*nang|나트랑|nha\s*trang/gi,' ').trim()||name;
    const q=norm(name),rows=[];
    for(const p of places){
      if(!point(p.position||p)||city!=='all'&&placeCityKey({...p,...point(p.position||p)})!==city)continue;
      const n=norm(p.name),score=n===q?0:(window.NameSearch?.score(p.name,name)??(n.includes(q)?2:-1));
      if(score<0||score>4)continue; // Phonetic suggestions are not verified origins.
      rows.push({p,score});
    }
    rows.sort((a,b)=>a.score-b.score);
    const best=rows[0]?.score;
    return rows.filter(r=>r.score===best).map(r=>r.p).filter((p,i,all)=>!all.slice(0,i).some(other=>geoDistanceMeters(point(p.position||p),point(other.position||other))<100));
  }
  async function bounded(work,signal,ms=6500){
    let timer,abort;try{return await Promise.race([work,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('위치 확인 시간이 초과됐어요.')),ms);
      abort=()=>reject(new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    })]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  function savedStay(){
    try{const p=JSON.parse(localStorage.getItem('viettrip_nearby_stay_v1'));return p?.expiresAt>Date.now()&&point(p)?p:null;}catch{return null;}
  }
  async function resolve(intent,{signal,places=[]}={}){
    if(!intent.nearby)return intent;
    const ref=intent.nearbyReference||{kind:'context',anchor:'',radius:null};
    let found=null,options=[];
    if(ref.kind==='named'){
      // A neighbourhood name refers to the area, not a shop whose name contains it.
      const zones=typeof EXTRA_DATA!=='undefined'?Object.entries(EXTRA_DATA).filter(([city])=>intent.city==='all'||city===intent.city).flatMap(([,data])=>data.zones||[]):[];
      const zone=zones.find(z=>z.center&&(norm(z.name)===norm(ref.anchor)||norm(z.name.split(/[·(]/)[0])===norm(ref.anchor)));
      if(zone)found=origin({...zone.center,name:zone.name},ref,'area');
      const local=candidates(places,ref.anchor,intent.city);
      if(!found&&local.length===1)found=origin(local[0],ref);
      else if(!found&&local.length>1)options=local.slice(0,4).map(p=>origin(p,ref));
      if(!found&&!options.length){
        const Place=window.google?.maps?.places?.Place;
        if(Place?.searchByText){
          const city=CITY_DATA[intent.city],request={textQuery:[window.NameSearch?.googleQuery(ref.anchor)||ref.anchor,city?.label,'Vietnam'].filter(Boolean).join(' '),fields:['id','displayName','formattedAddress','location','addressComponents'],language:'ko',region:'vn',maxResultCount:5,...(city?.center?{locationBias:{center:city.center,radius:25000}}:{})};
          const result=await bounded(Place.searchByText(request),signal);
          const raw=(result.places||[]).filter(p=>!p.addressComponents?.some(c=>c.types?.includes('country')&&c.shortText!=='VN')).map(p=>({id:p.id,name:p.displayName,address:p.formattedAddress,position:point(p.location)})).filter(p=>p.position&&(intent.city==='all'||placeCityKey({...p,...p.position})===intent.city));
          const matched=candidates(raw,ref.anchor,intent.city);
          if(matched.length===1)found=origin(matched[0],ref);
          else options=(matched.length?matched:raw.filter(p=>p.position)).slice(0,4).map(p=>origin(p,ref)).filter(Boolean);
        }
      }
    }else if(ref.kind==='stay'){
      const stay=state.nearby?.kind==='stay'?state.nearby:savedStay();
      if(stay)found=origin(stay,ref,'stay');
    }else if(ref.kind==='current'){
      if(state.nearby?.kind==='current')found=origin(state.nearby,ref,'current');
      else if(navigator.geolocation){
        try{
          const position=await bounded(new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:5500,maximumAge:60000})),signal,6000);
          if(position.coords.accuracy<=1000)found=origin({lat:position.coords.latitude,lng:position.coords.longitude,name:'현재 위치'},ref,'current');
        }catch(error){if(error.name==='AbortError')throw error;}
      }
    }else{
      const selected=places.find(p=>p.id===state.selected);
      if(state.nearby)found=origin(state.nearby,ref,state.nearby.kind);
      else if(selected)found=origin(selected,ref,'selected');
      else{const center=point(state.map?.getCenter?.());if(center)found=origin({...center,name:'현재 지도 중심'},ref,'map');}
    }
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    return {...intent,sortBy:intent.sortBy||'nearby_best',nearbyOrigin:found,nearbyOptions:options};
  }
  function appendContext(list,intent,onChoose){
    if(!intent.nearby)return;
    const box=document.createElement('li');box.className='aiSearchContext aiNearbyContext';
    const p=document.createElement('p'),o=intent.nearbyOrigin;
    p.textContent=o?o.name+' 기준 · 반경 '+distanceLabel(o.radius)+' 안에서 추천 · 거리는 직선거리':intent.nearbyOptions?.length?'어느 지점 근처에서 찾을까요?':intent.nearbyReference?.kind==='current'?'현재 위치를 확인하지 못했어요. 지도에서 기준 위치를 지정해 주세요.':intent.nearbyReference?.kind==='stay'?'숙소 위치를 지정하면 그 주변의 추천 장소를 찾을 수 있어요.':'기준 장소의 위치를 확인하지 못했어요. 지점명이나 주소를 함께 입력해 주세요.';
    box.append(p);
    if(o){
      const group=document.createElement('div');group.className='aiContextOptions';group.setAttribute('aria-label','주변 검색 반경');
      for(const radius of [...new Set([500,1000,2000,3000,o.radius])].sort((a,b)=>a-b)){
        const b=document.createElement('button');b.type='button';b.textContent=distanceLabel(radius);b.setAttribute('aria-pressed',String(radius===o.radius));b.onclick=()=>onChoose({...o,radius});group.append(b);
      }box.append(group);
    }else{
      const group=document.createElement('div');group.className='aiContextOptions';
      for(const option of intent.nearbyOptions||[]){const b=document.createElement('button');b.type='button';b.textContent=option.name+(option.address?' · '+option.address:'');b.onclick=()=>onChoose(option);group.append(b);}
      if(!group.childElementCount&&['current','stay'].includes(intent.nearbyReference?.kind)){
        const b=document.createElement('button');b.type='button';b.textContent=intent.nearbyReference.kind==='stay'?'숙소 위치 지정':'지도에서 위치 지정';b.onclick=()=>{window.AIMapSearch?.close();document.getElementById(intent.nearbyReference.kind==='stay'?'nearbyStay':'nearbyPick')?.click();};group.append(b);
      }box.append(group);
    }
    list.append(box);
  }
  window.AINearbySearch={resolve,appendContext,candidates,distanceLabel,point};
})();
