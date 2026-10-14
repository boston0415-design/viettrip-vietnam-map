// Route geometry only. Never fall back to a straight origin/destination line.
(()=>{
 'use strict';
 let active=null,lines=[],serial=0,fullPath=[],alleyPath=[],endMarker=null,startMarker=null;
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
 function erase(){lines.forEach(l=>l.setMap(null));lines=[];fullPath=[];alleyPath=[];if(endMarker)endMarker.setMap(null);endMarker=null;if(startMarker)startMarker.setMap(null);startMarker=null;}
 function clear(){const restore=document.body.classList.contains('routeNavigating');document.body.classList.remove('routeNavigating');serial++;active=null;erase();document.getElementById('destinationLineHint')?.remove();if(restore&&typeof renderMarkers==='function')renderMarkers();}
 function sync(){if(active)queueMicrotask(render);}
 function fit(path=fullPath){
  if(!path.length||!state.map)return;
  const bounds=new google.maps.LatLngBounds();path.forEach(p=>bounds.extend(p));
  const box=document.getElementById('destinationLineHint')?.getBoundingClientRect(),map=document.getElementById('map')?.getBoundingClientRect(),padding={top:Math.min(Math.max(70,(box?.bottom||80)-(map?.top||0)+48),(map?.height||600)*.6),right:40,bottom:45,left:40};
  if(innerWidth>900&&box){padding.top=70;padding.left=Math.min(box.right-(map?.left||0)+24,(map?.width||1200)*.45);}
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
  if(google.maps.Marker)startMarker=new google.maps.Marker({map:state.map,position:path[0],title:active.origin?.name||'현재 위치',label:'출발',zIndex:9999});
  if(google.maps.Marker)endMarker=new google.maps.Marker({map:state.map,position:point(active.place)||path.at(-1),title:active.place.name||'목적지',label:'도착',zIndex:9999});
 }
 function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
 function invalidate(){if(!active)return;serial++;active.loading=false;active.steps=[];erase();status('출발지와 목적지를 선택한 후 경로를 확인하세요.');}
 function endpoint(p){return p?.placeId?{placeId:p.placeId}:point(p)||p?.address;}
 function externalUrl(){
  const url=new URL(businessDirectionsUrl(active.place,{travelmode:active.mode.toLowerCase()}));
  if(active.origin){const p=point(active.origin);url.searchParams.set('origin',p?`${p.lat},${p.lng}`:active.origin.address||active.origin.name);if(active.origin.placeId)url.searchParams.set('origin_place_id',active.origin.placeId);}
  if(active.place.placeId)url.searchParams.set('destination_place_id',active.place.placeId);return url.href;
 }
 function editor(box){
  const form=element('form');form.className='routeEditor';
  const header=element('div');header.className='routeEditorHeader';header.append(element('strong','길찾기'));
  const close=element('button','×');close.type='button';close.setAttribute('aria-label','안내 닫기');close.onclick=clear;header.append(close);form.append(header);
  for(const [name,label,value] of [['origin','출발지','현재 위치'],['destination','목적지',active.place.name]]){
   const row=element('div');row.className='routeField';const title=element('label',label),input=element('input');input.id='route-'+name;title.htmlFor=input.id;input.setAttribute('aria-label',label);input.placeholder=label+' 장소·주소 검색';input.autocomplete='off';input.value=value||'';row.append(title,input);form.append(row);
   active[name+'Input']=input;
   const current=active;
   current[name+'Search']=window.RoutePlaceSearch?.bind(input,p=>{if(active!==current)return;if(name==='origin'){active.origin=p;active.useLocation=false;}else{active.place=p;active.key=key(p);}active[name+'Ready']=true;invalidate();},()=>{if(active!==current)return;active[name+'Ready']=false;if(name==='origin')active.useLocation=false;invalidate();});
  }
  const controls=element('div');controls.className='routeEditorControls';
  const gps=element('button','내 위치');gps.type='button';gps.onclick=()=>{active.origin=null;active.useLocation=true;active.originReady=true;active.originInput.value='현재 위치';active.originSearch?.hide();invalidate();calculate();};
  const swap=element('button','⇅');swap.type='button';swap.setAttribute('aria-label','출발지와 목적지 바꾸기');swap.onclick=async()=>{
   if(!active.originReady||!active.destinationReady){status('먼저 출발지와 목적지를 선택하세요.');return;}
   const current=active;invalidate();const token=serial;
   try{const origin=current.useLocation?{...await locate(),name:'현재 위치'}:current.origin;if(active!==current||serial!==token)return;const previous=current.place;current.place=origin;current.origin=previous;current.useLocation=false;current.key=key(origin);current.originInput.value=previous.name;current.destinationInput.value=origin.name;current.originSearch?.hide();current.destinationSearch?.hide();calculate();}catch{if(active===current&&serial===token)status('현재 위치를 확인할 수 없습니다. 출발지를 검색해 주세요.');}
  };
  const mode=element('select');mode.setAttribute('aria-label','이동 수단');for(const [value,label] of [['DRIVING','자동차'],['WALKING','도보']]){const option=element('option',label);option.value=value;mode.append(option);}mode.onchange=()=>{active.mode=mode.value;invalidate();calculate();};
  const go=element('button','경로 찾기');go.type='submit';go.className='routeSubmit';controls.append(gps,swap,mode,go);form.append(controls);
  form.onsubmit=e=>{e.preventDefault();calculate();};box.append(form);
 }
 function render(){
  if(!active)return;const panel=document.querySelector('.mapwrap');if(!panel)return;
  let box=document.getElementById('destinationLineHint');if(!box){box=element('section');box.id='destinationLineHint';box.className='destinationRoute';box.setAttribute('aria-label','길찾기');panel.append(box);editor(box);box.append(Object.assign(element('div'),{className:'routeResult'}));}
  if(box.dataset.revision===String(active.revision))return;box.dataset.revision=String(active.revision);const result=box.querySelector('.routeResult');result.replaceChildren();
  const message=element('p',active.message);message.setAttribute('role','status');result.append(message);
  const actions=element('div');actions.className='routeActions';
  if(fullPath.length){const all=element('button','전체 경로');all.type='button';all.onclick=()=>fit();actions.append(all);if(alleyPath.length){const near=element('button','골목 보기');near.type='button';near.onclick=()=>fit(alleyPath);actions.append(near);}}
  if(active.originReady&&active.destinationReady){const fallback=element('a','Google 지도에서 열기');fallback.href=externalUrl();fallback.target='_blank';fallback.rel='noopener noreferrer';actions.append(fallback);}result.append(actions);
  if(active.steps?.length){const details=element('details'),summary=element('summary','상세 경로'),list=element('ol');for(const step of active.steps)list.append(element('li',step));details.append(summary,list);result.append(details);}
  if(active.mode==='WALKING'&&fullPath.length)result.append(element('small','보행로 정보가 누락될 수 있습니다. 현장 표지와 통행 가능 여부를 확인하세요.'));
 }
 function status(message,loading=false){if(!active)return;active.message=message;active.loading=loading;active.revision++;render();}
 function locate(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('LOCATION'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>reject(Error('LOCATION')),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});});}
 async function route(origin,end,mode){
  const lib=await google.maps.importLibrary('routes');
  // This site's enabled Directions service supplies road entrances and turn geometry.
  const Directions=lib.DirectionsService||google.maps.DirectionsService;
  let failure;
  if(Directions){try{
   const result=await new Directions().route({origin,destination:end,travelMode:mode,region:'vn'}),r=result.routes?.[0];if(!r)throw Error('ZERO_RESULTS');
   const legs=r.legs||[],steps=legs.flatMap(l=>l.steps||[]);return {path:steps.length?steps.flatMap(s=>s.path||[]):r.overview_path,meters:legs.reduce((n,l)=>n+(l.distance?.value||0),0),millis:legs.reduce((n,l)=>n+(l.duration?.value||0)*1000,0),segments:steps.map(stepInfo)};
  }catch(e){failure=e;}}
  if(lib.Route){
   const modern=p=>p?.placeId?'places/'+p.placeId:p;
   const {routes}=await lib.Route.computeRoutes({origin:modern(origin),destination:modern(end),travelMode:mode,fields:['path','distanceMeters','durationMillis'],polylineQuality:'HIGH_QUALITY',language:'ko',region:'vn'});const r=routes?.[0];if(!r)throw Error('ZERO_RESULTS');return {path:r.path,meters:r.distanceMeters,millis:r.durationMillis,segments:[]};
  }
  throw failure||Error('UNAVAILABLE');
 }
 async function calculate(){
  if(!active||active.loading)return;
  if(!active.originReady){status('출발지를 검색 결과에서 선택하세요.');active.originSearch?.search();active.originInput.focus();return;}
  if(!active.destinationReady){status('목적지를 검색 결과에서 선택하세요.');active.destinationSearch?.search();active.destinationInput.focus();return;}
  const request=++serial,current=active,mode=current.mode;erase();current.steps=[];status(current.useLocation?'현재 위치 확인 중…':'경로를 찾고 있습니다…',true);
  try{
   const origin=current.useLocation?await locate():endpoint(current.origin);if(request!==serial)return;status('경로를 찾고 있습니다…',true);
   let timer;const result=await Promise.race([route(origin,endpoint(current.place),mode),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),18000);})]).finally(()=>clearTimeout(timer));if(request!==serial||active!==current)return;
   const path=(result.path||[]).map(point).filter(Boolean);if(path.length<2)throw Error('ZERO_RESULTS');
   draw(path,result.segments);current.steps=(result.segments||[]).map(s=>s.instruction).filter(Boolean);
   const km=(result.meters/1000).toFixed(1),minutes=Math.max(1,Math.round(result.millis/60000));
   status(`${mode==='WALKING'?'도보':'자동차'} ${km}km · 약 ${minutes}분`);fit();
  }catch(error){if(request!==serial)return;erase();current.steps=[];status(error.message==='LOCATION'?'현재 위치를 확인할 수 없습니다. 출발지에 장소·주소를 검색하거나 위치 권한을 켜 주세요.':(String(error.code||error.message).includes('ZERO_RESULTS')?'두 장소를 잇는 도로 경로가 없습니다. 출발지·목적지와 이동 수단을 확인하세요.':'도로 경로 연결이 지연됩니다. 경로 찾기를 다시 누르거나 Google 지도에서 열어 주세요.'));console.warn('Route unavailable',error?.code||error?.message);}
 }
 function open(){const p=destination();if(!p)return;if(active?.key===key(p)&&active.loading)return;clear();if(typeof closeDetailPanel==='function')closeDetailPanel();if(typeof closeMobileBusinessList==='function')closeMobileBusinessList();window.ListLayout?.setCollapsed(true);window.ChatDock?.close();document.body.classList.add('routeNavigating');if(typeof renderMarkers==='function')renderMarkers();active={place:p,origin:null,useLocation:true,originReady:true,destinationReady:true,key:key(p),mode:'DRIVING',message:'',loading:false,revision:0,steps:[]};calculate();}
 document.addEventListener('click',e=>{if(active&&e.target.closest?.('#chatLauncher'))clear();const link=e.target.closest?.('#detail [data-map-route]');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();open();});
 window.DestinationLine={sync,clear,fit,open,stepInfo};
})();
