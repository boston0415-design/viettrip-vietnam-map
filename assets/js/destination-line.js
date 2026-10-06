// Route geometry only. Never fall back to a straight origin/destination line.
(()=>{
 'use strict';
 let active=null,lines=[],serial=0,fullPath=[],alleyPath=[],endMarker=null;
 const point=p=>{if(!p)return null;const lat=typeof p.lat==='function'?p.lat():p.lat,lng=typeof p.lng==='function'?p.lng():p.lng;return lat!=null&&lng!=null&&lat!==''&&lng!==''&&Number.isFinite(+lat)&&Number.isFinite(+lng)&&Math.abs(+lat)<=90&&Math.abs(+lng)<=180?{lat:+lat,lng:+lng}:null;};
 const destination=()=>state.selected?db().places.find(p=>p.id===state.selected):window.PlaceSearch?.currentPlace();
 const key=p=>p?String(p.id||p.placeId||[p.lat,p.lng,p.name].join('|')):'';
 // Only explicit alley names in the route instruction qualify. Nearby landmarks do not.
 function stepInfo(step){
  const template=document.createElement('template');template.innerHTML=step.instructions||'';
  const primaryTemplate=document.createElement('template');primaryTemplate.innerHTML=(step.instructions||'').split(/<div|<br/i)[0];
  const road=primaryTemplate.content.querySelector('b')?.textContent||'';
  const instruction=(template.content.textContent||'').trim();
  const primary=(primaryTemplate.content.textContent||'').split(/통과|Pass by|Đi qua/i)[0];
  const normalize=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const namedRoad=normalize(road.trim());
  const explicit=road?/^(hem|ngo|ngach|kiet|alley)(?:\s|$)/.test(namedRoad):/(?:^|\s)(?:hem|ngo|ngach)\s+\d/.test(normalize(primary));
  return {path:(step.path||[]).map(point).filter(Boolean),alley:explicit,instruction};
 }
 function erase(){lines.forEach(l=>l.setMap(null));lines=[];fullPath=[];alleyPath=[];if(endMarker)endMarker.setMap(null);endMarker=null;}
 function clear(){document.body.classList.remove('routeNavigating');serial++;active=null;erase();document.getElementById('destinationLineHint')?.remove();}
 function sync(){if(active&&destination()&&key(destination())!==active.key)clear();if(active)queueMicrotask(render);}
 function fit(path=fullPath){
  if(!path.length||!state.map)return;
  const bounds=new google.maps.LatLngBounds();path.forEach(p=>bounds.extend(p));
  const box=document.getElementById('destinationLineHint')?.getBoundingClientRect(),map=document.getElementById('map')?.getBoundingClientRect(),padding={top:Math.min(Math.max(70,(box?.bottom||80)-(map?.top||0)+16),(map?.height||600)*.6),right:40,bottom:45,left:40};
  if(typeof cancelPendingMapWork==='function')cancelPendingMapWork();state.map.fitBounds(bounds,padding);
 }
 function draw(path,segments=[]){
  erase();fullPath=path;
  // Solid base preserves every returned path vertex; dotted overlays erase only explicitly named alley steps.
  lines.push(new google.maps.Polyline({map:state.map,path,strokeColor:'#2878e8',strokeWeight:3,strokeOpacity:1,clickable:false,zIndex:85}));
  // Render individual steps instead when all geometry is available, so no solid line remains under dots.
  if(segments.length&&segments.every(s=>s.path.length>1)){
   lines[0].setMap(null);lines=[];
   for(const segment of segments){
    const options={map:state.map,path:segment.path,clickable:false,zIndex:85};
    if(segment.alley){alleyPath.push(...segment.path);Object.assign(options,{strokeOpacity:0,icons:[{icon:{path:google.maps.SymbolPath.CIRCLE,scale:2,fillColor:'#2878e8',fillOpacity:1,strokeColor:'#fff',strokeWeight:1},offset:'0',repeat:'9px'}]});}
    else Object.assign(options,{strokeColor:'#2878e8',strokeWeight:3,strokeOpacity:1});
    lines.push(new google.maps.Polyline(options));
   }
  }
  if(google.maps.Marker)endMarker=new google.maps.Marker({map:state.map,position:point(active.place)||path.at(-1),title:active.place.name||'목적지',label:'도착',zIndex:9999});
 }
 function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
 function render(){
  if(!active)return;const panel=document.querySelector('.mapwrap');if(!panel)return;
  let box=document.getElementById('destinationLineHint');if(!box){box=element('section');box.id='destinationLineHint';box.className='destinationRoute';box.setAttribute('aria-label','길찾기');panel.append(box);}
  if(box.dataset.revision===String(active.revision))return;box.dataset.revision=String(active.revision);box.replaceChildren();
  const status=element('p',active.message);status.setAttribute('role','status');box.append(status);
  const actions=element('div');actions.className='routeActions';
  if(fullPath.length){const all=element('button','전체 경로');all.type='button';all.onclick=()=>fit();actions.append(all);if(alleyPath.length){const near=element('button','골목 보기');near.type='button';near.onclick=()=>fit(alleyPath);actions.append(near);}}
  if(!active.loading){const retry=element('button',fullPath.length?(active.mode==='DRIVING'?'도보로 보기':'자동차로 보기'):'다시 시도');retry.type='button';retry.onclick=()=>{if(fullPath.length)active.mode=active.mode==='DRIVING'?'WALKING':'DRIVING';calculate();};actions.append(retry);}
  const fallback=element('a','Google 지도에서 열기');fallback.href=businessDirectionsUrl(active.place,{travelmode:active.mode.toLowerCase()});fallback.target='_blank';fallback.rel='noopener noreferrer';actions.append(fallback);
  const close=element('button','안내 닫기');close.type='button';close.onclick=clear;actions.append(close);box.append(actions);
  if(active.steps?.length){const details=element('details'),summary=element('summary','상세 경로'),list=element('ol');for(const step of active.steps)list.append(element('li',step));details.append(summary,list);box.append(details);}
  if(active.mode==='WALKING'&&fullPath.length)box.append(element('small','보행로 정보가 누락될 수 있습니다. 현장 표지와 통행 가능 여부를 확인하세요.'));
 }
 function status(message,loading=false){if(!active)return;active.message=message;active.loading=loading;active.revision++;render();}
 function locate(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('LOCATION'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>reject(Error('LOCATION')),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});});}
 async function route(origin,end,mode){
  const lib=await google.maps.importLibrary('routes');
  if(lib.Route){
   try{const {routes}=await lib.Route.computeRoutes({origin,destination:end,travelMode:mode,fields:['path','distanceMeters','durationMillis','legs.steps'],polylineQuality:'HIGH_QUALITY',language:'ko',region:'vn'});const r=routes?.[0];if(!r)throw Error('ZERO_RESULTS');return {path:r.path,meters:r.distanceMeters,millis:r.durationMillis,segments:r.legs?.flatMap(l=>l.steps||[]).map(stepInfo)||[]};}
   catch(e){if(!lib.DirectionsService)throw e;}
  }
  const svc=new (lib.DirectionsService||google.maps.DirectionsService)();
  const result=await svc.route({origin,destination:end,travelMode:mode,region:'vn'}),r=result.routes?.[0];if(!r)throw Error('ZERO_RESULTS');
  const legs=r.legs||[],steps=legs.flatMap(l=>l.steps||[]);return {path:steps.flatMap(s=>s.path||[]),meters:legs.reduce((n,l)=>n+(l.distance?.value||0),0),millis:legs.reduce((n,l)=>n+(l.duration?.value||0)*1000,0),segments:steps.map(stepInfo)};
 }
 async function calculate(){
  if(!active||active.loading)return;const request=++serial,current=active,mode=current.mode;erase();status('현재 위치 확인 중…',true);
  try{
   const origin=await locate();if(request!==serial)return;status('경로를 찾고 있습니다…',true);
   let timer;const result=await Promise.race([route(origin,point(current.place)||current.place.address,mode),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),18000);})]).finally(()=>clearTimeout(timer));if(request!==serial||active!==current)return;
   const path=(result.path||[]).map(point).filter(Boolean);if(path.length<2)throw Error('ZERO_RESULTS');
   draw(path,result.segments);current.steps=(result.segments||[]).map(s=>s.instruction).filter(Boolean);
   const km=(result.meters/1000).toFixed(1),minutes=Math.max(1,Math.round(result.millis/60000));
   status(`${mode==='WALKING'?'도보':'자동차'} ${km}km · 약 ${minutes}분`);fit();
  }catch(error){if(request!==serial)return;erase();current.steps=[];status(error.message==='LOCATION'?'현재 위치를 확인할 수 없습니다. 위치 권한과 휴대폰 위치 설정을 켠 뒤 다시 시도해 주세요.':'도로 경로를 불러오지 못했습니다. 다시 시도하거나 Google 지도에서 열어 주세요.');console.warn('Route unavailable',error?.code||error?.message);}
 }
 function open(){const p=destination();if(!p)return;if(active?.key===key(p)&&active.loading)return;clear();if(typeof closeDetailPanel==='function')closeDetailPanel();if(typeof closeMobileBusinessList==='function')closeMobileBusinessList();window.ListLayout?.setCollapsed(true);window.ChatDock?.close();document.body.classList.add('routeNavigating');active={place:p,key:key(p),mode:'DRIVING',message:'',loading:false,revision:0,steps:[]};calculate();}
 document.addEventListener('click',e=>{if(active&&e.target.closest?.('#chatLauncher'))clear();const link=e.target.closest?.('#detail [data-map-route]');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();open();});
 window.DestinationLine={sync,clear,fit,open,stepInfo};
})();
