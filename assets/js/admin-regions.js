// Separate GeoJSON layer: selecting a boundary never changes business/rating filters.
const administrativeRegions={city:null,data:null,layer:null,halo:null,selected:null,request:0};
function clearAdministrativeBoundary(){
  administrativeRegions.layer?.setMap(null);administrativeRegions.halo?.setMap(null);
  administrativeRegions.layer=null;administrativeRegions.halo=null;administrativeRegions.selected=null;
}
function resetAdministrativeRegions(){
  administrativeRegions.request++;clearAdministrativeBoundary();administrativeRegions.city=null;administrativeRegions.data=null;
  const panel=document.getElementById('adminRegionControls');
  if(panel){panel.hidden=true;document.getElementById('openAdminRegions')?.setAttribute('aria-expanded','false')}
}
function validAdministrativeGeometry(geometry){
  if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return Array.isArray(polygons)&&polygons.length>0&&polygons.every(p=>Array.isArray(p)&&p.length>0&&p.every(r=>Array.isArray(r)&&r.length>=4&&r.every(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90)&&r[0][0]===r[r.length-1][0]&&r[0][1]===r[r.length-1][1]));
}
document.addEventListener('DOMContentLoaded',()=>{
  const panel=document.getElementById('adminRegionControls'),button=document.getElementById('openAdminRegions'),select=document.getElementById('adminRegionSelect'),status=document.getElementById('adminRegionStatus'),source=document.getElementById('adminRegionSource');
  const cache=new Map();
  function note(feature){
    if(!feature){status.textContent='구역을 선택하면 경계 전체로 이동합니다. 업체·평점 필터는 유지됩니다.';source.replaceChildren();return}
    const p=feature.properties;
    status.textContent=p.era==='2025'?'2025년 7월 개편 기준 시·성 경계입니다. 여행지 분류보다 넓을 수 있습니다.':'2020년 자료의 이전 행정구역입니다. 현재 행정구역과 다르며, 익숙한 지역을 찾는 참고용입니다.';
    source.replaceChildren();
    const a=document.createElement('a');a.href=p.era==='2025'?'https://data.humdata.org/dataset/cod-ab-vnm':'https://www.geoboundaries.org/api/current/gbOpen/VNM/ADM2/';a.target='_blank';a.rel='noopener noreferrer';a.textContent=p.era==='2025'?'출처: 베트남 통계청 · OCHA/HDX':'출처: 베트남 정부 · OCHA/geoBoundaries';
    const license=document.createElement('a');license.href='https://creativecommons.org/licenses/by/3.0/igo/';license.target='_blank';license.rel='noopener noreferrer';license.textContent='CC BY 3.0 IGO';
    source.append(a,' · ',license,' · 화면 표시를 위해 단순화한 참고 경계');
  }
  function display(allComponents=false){
    const feature=administrativeRegions.data?.features.find(f=>f.properties.id===select.value);
    if(!feature){clearAdministrativeBoundary();note(null);return}
    if(!state.map||!window.google?.maps?.Data){status.textContent='지도가 아직 준비되지 않았습니다. 지도가 열린 뒤 구역을 다시 선택해주세요.';return}
    if(!validAdministrativeGeometry(feature.geometry)){status.textContent='이 경계 데이터를 표시할 수 없습니다.';return}
    // Build both layers before replacing the old selection, so failures don't leave a partial overlay.
    const halo=new google.maps.Data(),layer=new google.maps.Data();
    try{
      halo.addGeoJson(feature);layer.addGeoJson(feature);
      halo.setStyle({strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:7,fillOpacity:0,clickable:false,zIndex:40});
      layer.setStyle({strokeColor:'#c81e35',strokeOpacity:1,strokeWeight:3.5,fillColor:'#e11d48',fillOpacity:0.055,clickable:false,zIndex:41});
      const bounds=new google.maps.LatLngBounds();layer.forEach(f=>f.getGeometry().forEachLatLng(p=>bounds.extend(p)));
      let view=bounds;
      const box=feature.properties.viewBounds;
      if(!allComponents&&Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)){
        view=new google.maps.LatLngBounds();view.extend({lng:box[0],lat:box[1]});view.extend({lng:box[2],lat:box[3]});
      }
      cancelPendingMapWork();clearSelectionRanges();clearAdministrativeBoundary();
      halo.setMap(state.map);layer.setMap(state.map);
      Object.assign(administrativeRegions,{halo,layer,selected:feature.properties.id});
      fitUnifiedBounds(view,{padding:78,maxZoom:14});note(feature);
      status.textContent+=allComponents?' 섬을 포함한 전체 경계를 표시합니다.':' 주요 육지 중심 보기 · 섬까지 보려면 전체 경계를 누르세요.';
    }catch{halo.setMap(null);layer.setMap(null);status.textContent='경계를 표시하지 못했습니다. 다른 구역을 선택하거나 다시 시도해주세요.'}
  }
  async function load(){
    const city=state.city,token=++administrativeRegions.request;
    select.disabled=true;status.textContent='행정경계를 불러오는 중…';source.replaceChildren();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      let data=cache.get(city);
      if(!data){const response=await fetch(`./assets/data/admin/${encodeURIComponent(city)}.geojson`,{signal:controller.signal});if(!response.ok)throw new Error('Boundary unavailable');data=await response.json();if(!Array.isArray(data.features)||!data.features.length||!data.features.every(f=>validAdministrativeGeometry(f.geometry)))throw new Error('Invalid boundaries');cache.set(city,data)}
      if(token!==administrativeRegions.request||city!==state.city)return;
      administrativeRegions.city=city;administrativeRegions.data=data;
      select.replaceChildren(new Option('행정구역 선택',''));
      for(const [era,label] of [['2025','현재 시·성 · 2025년 개편 기준'],['2020','이전 행정구역 · 2020년 자료']]){
        const group=document.createElement('optgroup');group.label=label;
        data.features.filter(f=>f.properties.era===era).forEach(f=>group.append(new Option(f.properties.label,f.properties.id)));
        if(group.children.length)select.append(group);
      }
      note(null);select.disabled=false;
    }catch{
      if(token!==administrativeRegions.request)return;
      select.replaceChildren(new Option('경계 불러오기 실패',''));status.textContent='연결을 확인한 뒤 행정구역 경계를 닫았다 다시 열어주세요.';
    }finally{clearTimeout(timer)}
  }
  button.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden&&(administrativeRegions.city!==state.city||!administrativeRegions.data))load();
  });
  select.addEventListener('change',()=>display(false));
  document.getElementById('fitAllAdminRegion').addEventListener('click',()=>display(true));
  document.getElementById('clearAdminRegion').addEventListener('click',()=>{clearAdministrativeBoundary();select.value='';note(null)});
});
