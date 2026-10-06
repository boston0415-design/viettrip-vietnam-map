// Route geometry only. Never fall back to a straight origin/destination line.
(()=>{
 'use strict';
 let active=null,lines=[],serial=0,fullPath=[];
 const point=p=>{if(!p)return null;const lat=typeof p.lat==='function'?p.lat():p.lat,lng=typeof p.lng==='function'?p.lng():p.lng;return lat!=null&&lng!=null&&lat!==''&&lng!==''&&Number.isFinite(+lat)&&Number.isFinite(+lng)&&Math.abs(+lat)<=90&&Math.abs(+lng)<=180?{lat:+lat,lng:+lng}:null;};
 const destination=()=>state.selected?db().places.find(p=>p.id===state.selected):window.PlaceSearch?.currentPlace();
 const key=p=>p?String(p.id||p.placeId||[p.lat,p.lng,p.name].join('|')):'';
 const distance=(a,b)=>{const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2)));};
 function splitPath(path,nearMeters=300){
  let left=nearMeters;
  for(let i=path.length-1;i>0;i--){const a=path[i-1],b=path[i],d=distance(a,b);if(d>left){const ratio=(d-left)/d,cut={lat:a.lat+(b.lat-a.lat)*ratio,lng:a.lng+(b.lng-a.lng)*ratio};return {main:[...path.slice(0,i),cut],near:[cut,...path.slice(i)]};}left-=d;}
  return {main:[],near:path};
 }
 function erase(){lines.forEach(l=>l.setMap(null));lines=[];fullPath=[];}
 function clear(){serial++;active=null;erase();document.getElementById('destinationLineHint')?.remove();}
 function sync(){if(active&&key(destination())!==active.key)clear();if(active)queueMicrotask(render);}
 function fit(path=fullPath){
  if(!path.length||!state.map)return;
  const bounds=new google.maps.LatLngBounds();path.forEach(p=>bounds.extend(p));
  const detail=document.getElementById('detail')?.getBoundingClientRect(),map=document.getElementById('map')?.getBoundingClientRect(),padding={top:50,right:40,bottom:50,left:40};
  if(detail&&map){if(innerWidth<=768)padding.bottom=Math.min(Math.max(50,map.bottom-detail.top+20),map.height*.65);else padding.left=Math.min(Math.max(40,detail.right-map.left+20),map.width*.45);}
  if(typeof cancelPendingMapWork==='function')cancelPendingMapWork();state.map.fitBounds(bounds,padding);
 }
 function draw(path){
  erase();fullPath=path;const parts=splitPath(path);
  if(parts.main.length>1)lines.push(new google.maps.Polyline({map:state.map,path:parts.main,strokeColor:'#2878e8',strokeWeight:7,strokeOpacity:1,clickable:false,zIndex:85}));
  if(parts.near.length>1)lines.push(new google.maps.Polyline({map:state.map,path:parts.near,strokeOpacity:0,clickable:false,zIndex:86,icons:[{icon:{path:google.maps.SymbolPath.CIRCLE,scale:3.5,fillColor:'#2878e8',fillOpacity:1,strokeColor:'#fff',strokeWeight:1},offset:'0',repeat:'12px'}]}));
  fit();
 }
 function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
 function render(){
  if(!active)return;const panel=document.getElementById('detail');if(!panel?.classList.contains('show'))return;
  let box=document.getElementById('destinationLineHint');if(!box){box=element('section');box.id='destinationLineHint';box.className='destinationRoute';box.setAttribute('aria-label','길찾기');panel.querySelector('.detailQuickActions')?.after(box);}
  if(box.dataset.revision===String(active.revision))return;box.dataset.revision=String(active.revision);box.replaceChildren();
  const status=element('p',active.message);status.setAttribute('role','status');box.append(status);
  const actions=element('div');actions.className='routeActions';
  if(fullPath.length){const all=element('button','전체 경로'),near=element('button','목적지 근처');all.type=near.type='button';all.onclick=()=>fit();near.onclick=()=>fit(splitPath(fullPath).near);actions.append(all,near);}
  if(!active.loading){const retry=element('button',fullPath.length?(active.mode==='DRIVING'?'도보로 보기':'자동차로 보기'):'다시 시도');retry.type='button';retry.onclick=()=>{if(fullPath.length)active.mode=active.mode==='DRIVING'?'WALKING':'DRIVING';calculate();};actions.append(retry);}
  const fallback=element('a','Google 지도에서 열기');fallback.href=businessDirectionsUrl(active.place,{travelmode:active.mode.toLowerCase()});fallback.target='_blank';fallback.rel='noopener noreferrer';actions.append(fallback);
  const close=element('button','안내 닫기');close.type='button';close.onclick=clear;actions.append(close);box.append(actions);
  if(active.steps?.length){const list=element('ol');for(const step of active.steps.slice(-4))list.append(element('li',step));box.append(list);}
  if(active.mode==='WALKING'&&fullPath.length)box.append(element('small','보행로 정보가 누락될 수 있습니다. 현장 표지와 통행 가능 여부를 확인하세요.'));
 }
 function status(message,loading=false){if(!active)return;active.message=message;active.loading=loading;active.revision++;render();}
 function locate(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('LOCATION'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>reject(Error('LOCATION')),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});});}
 async function route(origin,end,mode){
  const lib=await google.maps.importLibrary('routes');
  if(lib.Route){
   try{const {routes}=await lib.Route.computeRoutes({origin,destination:end,travelMode:mode,fields:['path','distanceMeters','durationMillis','legs.steps.instructions'],polylineQuality:'HIGH_QUALITY',language:'ko',region:'vn'});const r=routes?.[0];if(!r)throw Error('ZERO_RESULTS');return {path:r.path,meters:r.distanceMeters,millis:r.durationMillis,steps:r.legs?.flatMap(l=>l.steps||[]).map(s=>s.instructions).filter(Boolean)||[]};}
   catch(e){if(!lib.DirectionsService)throw e;}
  }
  const svc=new (lib.DirectionsService||google.maps.DirectionsService)();
  const result=await svc.route({origin,destination:end,travelMode:mode,region:'vn'}),r=result.routes?.[0];if(!r)throw Error('ZERO_RESULTS');
  const legs=r.legs||[],steps=legs.flatMap(l=>l.steps||[]);return {path:steps.flatMap(s=>s.path||[]),meters:legs.reduce((n,l)=>n+(l.distance?.value||0),0),millis:legs.reduce((n,l)=>n+(l.duration?.value||0)*1000,0),steps:steps.map(s=>{const d=document.createElement('div');d.innerHTML=s.instructions||'';return d.textContent||'';})};
 }
 async function calculate(){
  if(!active||active.loading)return;const request=++serial,current=active,mode=current.mode;erase();status('현재 위치 확인 중…',true);
  try{
   const origin=await locate();if(request!==serial)return;status('경로를 찾고 있습니다…',true);
   let timer;const result=await Promise.race([route(origin,point(current.place)||current.place.address,mode),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),18000);})]).finally(()=>clearTimeout(timer));if(request!==serial||active!==current)return;
   const path=(result.path||[]).map(point).filter(Boolean);if(path.length<2)throw Error('ZERO_RESULTS');
   draw(path);current.steps=result.steps;
   const km=(result.meters/1000).toFixed(1),minutes=Math.max(1,Math.round(result.millis/60000));
   status(`${mode==='WALKING'?'도보':'자동차'} ${km}km · 약 ${minutes}분 · 목적지 인근 300m 상세 안내`);
  }catch(error){if(request!==serial)return;erase();current.steps=[];status(error.message==='LOCATION'?'현재 위치를 확인할 수 없습니다. 위치 권한과 휴대폰 위치 설정을 켠 뒤 다시 시도해 주세요.':'도로 경로를 불러오지 못했습니다. 다시 시도하거나 Google 지도에서 열어 주세요.');console.warn('Route unavailable',error?.code||error?.message);}
 }
 function open(){const p=destination();if(!p)return;if(active?.key===key(p)&&active.loading)return;clear();active={place:p,key:key(p),mode:'DRIVING',message:'',loading:false,revision:0,steps:[]};calculate();}
 document.addEventListener('click',e=>{const link=e.target.closest?.('#detail [data-map-route]');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();open();});
 window.DestinationLine={sync,clear,fit,open,splitPath};
})();
