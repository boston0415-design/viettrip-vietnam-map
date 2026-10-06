// A direction aid, not a routed walking/driving path. Uses the existing location permission flow.
(()=>{
 'use strict';
 let line=null,points=null;
 function point(value){
  if(!value)return null;
  const lat=typeof value.lat==='function'?value.lat():value.lat,lng=typeof value.lng==='function'?value.lng():value.lng;
  if(lat==null||lng==null||lat===''||lng==='')return null;
  return Number.isFinite(+lat)&&Number.isFinite(+lng)&&Math.abs(+lat)<=90&&Math.abs(+lng)<=180?{lat:+lat,lng:+lng}:null;
 }
 function destination(){return state.selected?db().places.find(p=>p.id===state.selected):window.PlaceSearch?.currentPlace();}
 function removeLine(){if(line)line.setMap(null);line=null;points=null;}
 function clear(){removeLine();document.getElementById('destinationLineHint')?.remove();}
 function hint(){
  const target=point(destination()),panel=document.getElementById('detail');
  if(!target||!panel?.classList.contains('show')){document.getElementById('destinationLineHint')?.remove();return;}
  let box=document.getElementById('destinationLineHint');
  if(!box){box=document.createElement('div');box.id='destinationLineHint';box.className='destinationLineHint';panel.querySelector('.detailQuickActions')?.after(box);}
  box.replaceChildren();
  const label=document.createElement('span');label.textContent=points?'점선은 목적지 방향입니다 · 실제 도로 경로 아님':'내 위치를 켜면 목적지까지 점선으로 표시합니다';
  const button=document.createElement('button');button.type='button';button.textContent=points?'전체 선 보기':'내 위치 켜기';button.addEventListener('click',()=>points?fit():locateUser());
  box.append(label,button);
 }
 function sync(){
  const start=point(state.userMarker?.getPosition()),end=point(destination());
  if(!start||!end||!state.map||!window.google?.maps?.Polyline)removeLine();
  else{
   points=[start,end];
   if(!line)line=new google.maps.Polyline({map:state.map,path:points,geodesic:true,clickable:false,strokeOpacity:0,zIndex:80,icons:[{icon:{path:'M 0,-1 0,1',strokeColor:'#6554d7',strokeOpacity:1,strokeWeight:3,scale:2},offset:'0',repeat:'12px'},{icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,fillColor:'#6554d7',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:1,scale:4},offset:'100%'}]});
   else{line.setMap(state.map);line.setPath(points);}
  }
  queueMicrotask(hint);
 }
 function fit(){
  if(!points||!state.map)return;
  const bounds=new google.maps.LatLngBounds();points.forEach(p=>bounds.extend(p));
  const mobile=window.innerWidth<=768;
  const detail=document.getElementById('detail')?.getBoundingClientRect();
  const map=document.getElementById('map')?.getBoundingClientRect();
  const padding={top:64,right:48,bottom:64,left:48};
  if(detail&&map){
   if(mobile)padding.bottom=Math.min(Math.max(64,map.bottom-detail.top+24),map.height*.65);
   else padding.left=Math.min(Math.max(48,detail.right-map.left+24),map.width*.45);
  }
  if(typeof cancelPendingMapWork==='function')cancelPendingMapWork();
  state.map.fitBounds(bounds,padding);
 }
 window.DestinationLine={sync,clear,fit};
})();
