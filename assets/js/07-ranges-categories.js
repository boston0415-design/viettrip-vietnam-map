function estimateBoundsZoom(bounds,padding=78,maxZoom=16){
  if(!state.map || !bounds || bounds.isEmpty())return null;

  const ne=bounds.getNorthEast();
  const sw=bounds.getSouthWest();
  const div=state.map.getDiv();

  const width=Math.max(140,(div?.clientWidth||800)-padding*2);
  const height=Math.max(140,(div?.clientHeight||600)-padding*2);

  let lngDiff=ne.lng()-sw.lng();
  if(lngDiff<0)lngDiff+=360;
  lngDiff=Math.max(lngDiff,0.000001);

  const yNorth=mercatorY(ne.lat());
  const ySouth=mercatorY(sw.lat());
  const latFraction=Math.max(Math.abs(ySouth-yNorth),0.000001);
  const lngFraction=Math.max(lngDiff/360,0.000001);

  const worldPx=256;
  const zoomX=Math.log2(width/(worldPx*lngFraction));
  const zoomY=Math.log2(height/(worldPx*latFraction));

  let target=Math.min(zoomX,zoomY,maxZoom);
  if(!Number.isFinite(target))target=maxZoom;

  return Math.max(4,target);
}

async function smoothFitBounds(bounds,{padding=78,maxZoom=16,duration=560}={}){
  if(!state.map || !bounds || bounds.isEmpty())return;

  const center=bounds.getCenter();
  const targetCenter={lat:center.lat(),lng:center.lng()};
  const targetZoom=estimateBoundsZoom(bounds,padding,maxZoom);
  if(!Number.isFinite(targetZoom))return;

  const currentCenter=state.map.getCenter();
  const startCenter={
    lat:currentCenter?.lat?.() ?? targetCenter.lat,
    lng:currentCenter?.lng?.() ?? targetCenter.lng
  };
  const startZoom=Number(state.map.getZoom())||targetZoom;

  state.rangeMoveAnimationToken=(state.rangeMoveAnimationToken||0)+1;
  const token=state.rangeMoveAnimationToken;

  const dLat=targetCenter.lat-startCenter.lat;
  const dLng=normalizeLngDelta(targetCenter.lng-startCenter.lng);
  const dZoom=targetZoom-startZoom;
  const startTime=performance.now();

  await new Promise(resolve=>{
    function frame(now){
      if(!state.map || state.rangeMoveAnimationToken!==token){
        resolve();
        return;
      }

      const t=Math.min(1,(now-startTime)/duration);
      const e=easeInOutCubicValue(t);

      state.map.setCenter({
        lat:startCenter.lat+dLat*e,
        lng:startCenter.lng+dLng*e
      });
      state.map.setZoom(startZoom+dZoom*e);

      if(t<1){
        requestAnimationFrame(frame);
      }else{
        state.map.setCenter(targetCenter);
        state.map.setZoom(targetZoom);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function fitUnifiedBounds(bounds,{padding=78,maxZoom=16}={}){
  return smoothFitBounds(bounds,{padding,maxZoom,duration:560});
}

function fitCircleGeometry(center,radius,options={}){
  const b=makeBounds();
  extendBoundsByCircle(b,center,radius);
  fitUnifiedBounds(b,options);
}

function resolvePoiLocationPromise(p,timeoutMs=3200){
  return new Promise(resolve=>{
    let finished=false;
    const finish=(loc)=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      resolve(loc||null);
    };
    const timer=setTimeout(()=>finish(null),timeoutMs);

    try{
      resolvePoiLocation(p,loc=>finish(loc));
    }catch(err){
      console.warn('POI resolve failed',p?.name,err);
      finish(null);
    }
  });
}

function resolveGolfLocationPromise(g,timeoutMs=5000){
  return new Promise(resolve=>{
    let finished=false;

    const finish=(loc)=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      resolve(loc||null);
    };

    const timer=setTimeout(()=>finish(null),timeoutMs);

    try{
      resolveGolfLocation(g,loc=>finish(loc));
    }catch(err){
      console.warn('Golf resolve failed',g?.name,err);
      finish(null);
    }
  });
}


function fitLocations(locations){
  if(!state.map || !locations.length)return;
  const b=makeBounds();
  locations.forEach(x=>b.extend(x));
  fitUnifiedBounds(b,{padding:78,maxZoom:16});
}



function categoryRangeColor(categoryId){
  return ({
    stay:'#2563eb',
    restaurant:'#f97316',
    spa:'#ec4899',
    karaoke:'#8b5cf6',
    cafe:'#b7791f',
    shopping:'#db2777',
    bar:'#6366f1',
    golf:'#15803d',
    market:'#8b5cf6',
    attraction:'#10b981'
  })[categoryId]||'#475569';
}

function businessCircleRadius(categoryId){
  return ({
    stay:150,
    restaurant:110,
    spa:110,
    karaoke:120,
    cafe:100,
    shopping:130,
    bar:120,
    market:130,
    attraction:150,
    golf:180
  })[categoryId]||110;
}

function airportMainRadius(p){
  const n=String(p?.name||'');
  if(/떤선녓|탄손녓|Tan Son Nhat/i.test(n))return 1650;
  if(/노이바이|Noi Bai/i.test(n))return 1900;
  if(/다낭|Da Nang/i.test(n))return 1200;
  if(/깜라인|Cam Ranh/i.test(n))return 1650;
  if(/푸꾸옥|Phu Quoc/i.test(n))return 1250;
  if(/리엔크엉|Lien Khuong/i.test(n))return 1350;
  return 1250;
}

function pointCircleRadius(type,p=null){
  if(type==='공항') return airportMainRadius(p);
  if(type==='터미널') return 180;
  if(type==='그랩승차' || type==='택시승차') return 90;
  if(type==='전철역') return 420;
  if(type==='기차역') return 220;
  if(type==='병원') return 170;
  if(type==='쇼핑') return 180;
  return 150;
}


function pointHaloSize(type){
  if(type==='공항')return 68;
  if(type==='전철역')return 58;
  if(type==='기차역')return 58;
  if(type==='병원')return 56;
  if(type==='쇼핑')return 54;
  if(type==='터미널')return 52;
  if(type==='그랩승차'||type==='택시승차')return 48;
  return 52;
}

function addPointRangeHalo(type,location){
  if(!state.map || !location)return null;

  const size=pointHaloSize(type);
  const color=poiColor(type);

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-4}"
      fill="${color}" fill-opacity=".09"
      stroke="#ffffff" stroke-opacity=".95" stroke-width="6"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-5}"
      fill="none" stroke="${color}" stroke-opacity=".98" stroke-width="3.5"/>
  </svg>`;

  const marker=new google.maps.Marker({
    map:state.map,
    position:location,
    clickable:true,
    zIndex:35,
    icon:{
      url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),
      scaledSize:new google.maps.Size(size,size),
      anchor:new google.maps.Point(size/2,size/2)
    }
  });

  marker.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(location,1);
  });

  state.selectionOverlays.push(marker);
  return marker;
}


function addUnifiedPointRange(type,location,p=null){
  // Airport/POI coordinates identify a point, not the property's boundary.
  return addPointRangeHalo(type,location);
}

function addPointCoverageCircle(type,location,p=null){
  if(!state.map)return;
  const color=poiColor(type);
  const circle=new google.maps.Circle({
    map:state.map,
    center:location,
    radius:pointCircleRadius(type,p),
    fillColor:color,
    fillOpacity:type==='공항'?.07:.11,
    strokeColor:color,
    strokeOpacity:type==='공항'?.82:.90,
    strokeWeight:type==='공항'?3:2.6,
    clickable:true,
    zIndex:12
  });

  circle.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(location,1);
  });

  state.selectionOverlays.push(circle);
  return circle;
}


function fitPointLocations(locations){
  if(!state.map || !locations.length)return;
  const b=makeBounds();
  locations.forEach(x=>b.extend(x));
  fitUnifiedBounds(b,{padding:78,maxZoom:16});
}

async function showPointSet(points,typeForCoverage=null){
  cancelPendingMapWork();
  closeSystemInfo();
  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  if(!points.length)return;

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;

  const resolved=await Promise.all(
    points.map(async p=>({p,location:await resolvePoiLocationPromise(p)}))
  );

  if(state.mapActionToken!==token)return;

  const bounds=makeBounds();
  let shown=0;

  resolved.forEach(({p,location})=>{
    if(!location)return;

    createSelectedPoiMarker(p,location,false);
    const rangeType=typeForCoverage||p.type;
    addUnifiedPointRange(rangeType,location,p);

    extendBoundsByCircle(
      bounds,
      location,
      pointCircleRadius(typeForCoverage||p.type,p)
    );
    shown++;
  });

  if(shown){
    fitUnifiedBounds(bounds,{padding:82,maxZoom:16});
    const label=typeForCoverage||points[0]?.type||'위치';
    setDbStatus(`${label} ${shown}곳 · 범위 ${shown}개 표시`,true);
  }

  state.rangeSelectionKey=`points:${state.city}:${typeForCoverage||'mixed'}`;
}

function matchesNavigationScope(p){
  const def=navDef(state.navCategory);
  if(!def)return true;
  const category=def.kind==='business'?def.id:({shopping:'shopping','market-nav':'market','attraction-nav':'attraction','golf-nav':'golf'})[def.id];
  // Infrastructure and named map features have no registered-business category.
  if(!category)return false;
  if(p.category!==category)return false;
  const selected=state.selectedNavItem;
  if(def.kind!=='business' && selected && !['all','__all__'].includes(selected)){
    return normalizePlaceName(p.name||'')===normalizePlaceName(selected);
  }
  return true;
}

function selectSystemFeature(type,name){
  const def=NAV_CATEGORIES.find(d=>d.type===type || (d.kind==='airport' && ['터미널','그랩승차','택시승차'].includes(type)));
  state.navCategory=def?.id||null;
  state.selectedNavItem=name;
  state.cat=type==='쇼핑'?'shopping':'all';
  state.sub='all';
  state.areaType=def?.type||type;
  resetIndependentBusinessFilters();
  clearSelectionRanges();
  clearSelectedSystemIcons();
  renderAll();
  renderHierarchyNav();
}

function refreshRegisteredCoverage(){
  (state.selectionOverlays||[]).filter(o=>o._registeredCoverage).forEach(o=>o.setMap(null));
  state.selectionOverlays=(state.selectionOverlays||[]).filter(o=>!o._registeredCoverage);
  if(!state.map || !state.rangeSelectionKey)return;
  const key=state.rangeSelectionKey;
  if(!/^(business|shopping|golf|type):/.test(key))return;
  const def=navDef(state.navCategory);
  if(key.startsWith('type:') && !['market-nav','attraction-nav'].includes(def?.id))return;
  if(key.startsWith('golf:') && !key.endsWith(':all'))return;
  items().forEach(p=>{
    const loc=validMapLocation(p);
    if(!loc)return;
    const circle=addSelectionCircle(loc,businessCircleRadius(p.category),categoryRangeColor(p.category),.065,.68);
    if(circle)circle._registeredCoverage=true;
  });
}

function extendRegisteredBounds(bounds,categoryId){
  let count=0;
  items().filter(p=>p.category===categoryId).forEach(p=>{
    const loc=validMapLocation(p);
    if(!loc)return;
    extendBoundsByCircle(bounds,loc,businessCircleRadius(categoryId));
    count++;
  });
  return count;
}


async function showShoppingCategory(){
  cancelPendingMapWork();
  resetIndependentBusinessFilters();
  closeSystemInfo();
  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  state.cat='shopping';
  state.sub='all';
  renderAll();

  const systemPoints=currentPoints().filter(p=>p.type==='쇼핑');
  const registered=items().filter(p=>p.category==='shopping');

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;

  const resolved=await Promise.all(
    systemPoints.map(async p=>({p,location:await resolvePoiLocationPromise(p)}))
  );

  if(state.mapActionToken!==token)return;

  const bounds=makeBounds();
  let shown=0;

  resolved.forEach(({p,location})=>{
    if(!location)return;
    createSelectedPoiMarker(p,location,false);
    addUnifiedPointRange('쇼핑',location,p);
    extendBoundsByCircle(bounds,location,pointCircleRadius('쇼핑',p));
    shown++;
  });

  const color=categoryRangeColor('shopping');
  const radius=businessCircleRadius('shopping');

  registered.forEach(p=>{
    if(validMapLocation(p)){
      const loc={lat:Number(p.lat),lng:Number(p.lng)};
      const circle=addSelectionCircle(loc,radius,color,.065,.68);
      if(circle)circle._registeredCoverage=true;
      extendBoundsByCircle(bounds,loc,radius);
      shown++;
    }
  });

  if(shown){
    fitUnifiedBounds(bounds,{padding:82,maxZoom:16});
  }

  state.rangeSelectionKey=`shopping:${state.city}:all`;
}


async function showMetroCategory(){
  cancelPendingMapWork();
  closeSystemInfo();
  const stations=currentPoints().filter(p=>p.type==='전철역');

  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  if(!stations.length){
    setDbStatus('이 지역의 전철역 정보가 아직 등록되지 않았습니다.');
    return;
  }

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;

  const resolved=await Promise.all(
    stations.map(async station=>({
      station,
      location:await resolvePoiLocationPromise(station)
    }))
  );

  if(state.mapActionToken!==token)return;

  const bounds=makeBounds();
  let shown=0;

  resolved.forEach(({station,location})=>{
    if(!location)return;

    createSelectedPoiMarker(station,location,false);

    // 모든 전철역은 링을 한 겹만 표시
    addUnifiedPointRange('전철역',location,station);

    extendBoundsByCircle(bounds,location,pointCircleRadius('전철역',station));
    shown++;
  });

  if(shown){
    fitUnifiedBounds(bounds,{padding:84,maxZoom:15});
    setDbStatus(`전철역 ${shown}곳 · 범위 ${shown}개 표시`,true);
  }

  state.rangeSelectionKey=`metro:${state.city}:all`;
}
function showPointCategory(type){
  const points=currentPoints().filter(p=>p.type===type);
  if(!points.length){
    clearSelectionRanges();
    clearSelectedSystemIcons();
    setDbStatus(`${type} 정보가 아직 등록되지 않았습니다.`);
    return;
  }
  showPointSet(points,type);
}


function addGolfRangeRing(location,g=null){
  if(!state.map || !location)return null;

  const size=86;
  const color='#15803d';

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-7}"
      fill="${color}" fill-opacity=".10"
      stroke="#ffffff" stroke-opacity=".96" stroke-width="7"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-9}"
      fill="none" stroke="${color}" stroke-opacity=".96" stroke-width="4"/>
  </svg>`;

  const ring=new google.maps.Marker({
    map:state.map,
    position:location,
    title:g?.name?`${g.name} 범위`:'골프장 범위',
    clickable:true,
    zIndex:34,
    icon:{
      url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),
      scaledSize:new google.maps.Size(size,size),
      anchor:new google.maps.Point(size/2,size/2)
    }
  });

  ring.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(location,1);
  });

  state.selectionOverlays.push(ring);
  return ring;
}

function createGolfMarker(g,location,clearExisting=true){
  if(clearExisting) clearSelectedSystemIcons();

  const marker=new google.maps.Marker({
    map:state.map,
    position:location,
    title:g.name,
    zIndex:80,
    icon:golfSvg(false),
  });

  marker.addListener('mouseover',()=>{
    marker.setIcon(golfSvg(true));
  });

  marker.addListener('mouseout',()=>{
    marker.setIcon(golfSvg(false));
    hideHover();
  });

  marker.addListener('click',async ()=>{
    closeSystemInfo();
    await focusRangeLocation(location,1);
  });

  marker._golfName=g.name;
  state.golfMarkers.push(marker);
  return marker;
}

async function showGolfCategory(){
  cancelPendingMapWork();
  closeSystemInfo();
  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  const golf=currentGolf();
  state.rangeSelectionKey=`golf:${state.city}:all`;
  if(!golf.length && !items().some(p=>p.category==='golf')){
    setDbStatus('이 지역의 골프장 정보가 아직 없습니다.');
    return;
  }

  setDbStatus(`골프장 ${golf.length}곳 위치 확인 중…`);

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;

  const resolved=await Promise.all(
    golf.map(async g=>({g,location:await resolveGolfLocationPromise(g)}))
  );

  if(state.mapActionToken!==token)return;

  const bounds=makeBounds();
  let shown=0;
  const missing=[];

  resolved.forEach(({g,location})=>{
    if(!location){
      missing.push(g.name);
      return;
    }

    createGolfMarker(g,location,false);
    addGolfRangeRing(location,g);

    // 화면 맞춤 계산은 실제 골프장 주변 약 700m를 기준으로 하되,
    // 사용자에게 보이는 범위는 줌과 무관한 단일 링으로 표시.
    extendBoundsByCircle(bounds,location,700);
    shown++;
  });

  shown+=extendRegisteredBounds(bounds,'golf');
  state.rangeSelectionKey=`golf:${state.city}:all`;
  refreshRegisteredCoverage();
  if(shown){
    fitUnifiedBounds(bounds,{padding:82,maxZoom:16});
    setDbStatus(
      missing.length
        ? `골프장 ${shown}곳 표시 · 위치 미확인 ${missing.length}곳`
        : `골프장 ${shown}곳 표시`,
      true
    );
  }else{
    setDbStatus('골프장 위치를 찾지 못했습니다.');
  }

  state.rangeSelectionKey=`golf:${state.city}:all`;
}

function focusBusinessCategory(categoryId,subId='all'){
  cancelPendingMapWork();
  resetIndependentBusinessFilters();
  closeSystemInfo();
  clearSelectionRanges();
  clearAreaLabels();
  clearSelectedSystemIcons();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  state.cat=categoryId;
  state.sub=subId;
  state.rangeSelectionKey=`business:${state.city}:${categoryId}:${subId}:${categoryId==='restaurant'?state.restaurantTag:'all'}`;
  renderAll();
  // renderAll builds coverage from the same filtered items; the loop below only fits bounds.

  const places=items();

  if(!places.length){
    setDbStatus('이 분류에 등록된 업체가 아직 없습니다.');
    return;
  }

  const bounds=makeBounds();
  const color=categoryRangeColor(categoryId);
  const radius=businessCircleRadius(categoryId);
  let shown=0;

  places.forEach(p=>{
    if(validMapLocation(p)){
      const loc={lat:Number(p.lat),lng:Number(p.lng)};
      extendBoundsByCircle(bounds,loc,radius);
      shown++;
    }
  });

  state.rangeSelectionKey=`business:${state.city}:${categoryId}:${subId}:${categoryId==='restaurant'?state.restaurantTag:'all'}`;

  if(shown){
    // 범위와 등록업체 마커를 반드시 동시에 보이게 한다.
    renderMarkers();
    fitUnifiedBounds(bounds,{padding:82,maxZoom:16});
    const tagLabel=categoryId==='restaurant' && state.restaurantTag!=='all' ? ` · ${state.restaurantTag}` : '';
    setDbStatus(`${catLabel(categoryId)}${tagLabel} 등록업체 ${shown}곳 표시`,true);
  }
}

function resolveGolfLocation(g,done){
  if(validMapLocation(g)){
    done({lat:Number(g.lat),lng:Number(g.lng)});
    return;
  }

  const query=[g.name,g.address,'Vietnam'].filter(Boolean).join(' ');

  const tryPlaces=()=>{
    if(!(google.maps.places && google.maps.places.PlacesService && state.map)){
      done(null);
      return;
    }

    const service=new google.maps.places.PlacesService(state.map);
    service.textSearch(
      {query,region:'VN'},
      (places,status)=>{
        if(
          status===google.maps.places.PlacesServiceStatus.OK &&
          places &&
          places[0]?.geometry?.location
        ){
          const loc=places[0].geometry.location;
          done({lat:loc.lat(),lng:loc.lng()});
        }else{
          done(null);
        }
      }
    );
  };

  if(!g.address || !google.maps.Geocoder){
    tryPlaces();
    return;
  }

  const geocoder=new google.maps.Geocoder();
  geocoder.geocode(
    {address:g.address,region:'VN'},
    (results,status)=>{
      if(status==='OK' && results && results[0]){
        const loc=results[0].geometry.location;
        done({lat:loc.lat(),lng:loc.lng()});
      }else{
        tryPlaces();
      }
    }
  );
}

async function jumpToGolf(name){
  cancelPendingMapWork();
  clearSelectionRanges();
  clearAreaLabels();

  const g=currentGolf().find(x=>x.name===name);
  if(!g){
    setDbStatus(`"${name}" 골프장 데이터를 찾지 못했습니다.`);
    return;
  }
  if(!state.map){
    setDbStatus('지도가 아직 준비되지 않았습니다.');
    return;
  }

  selectSystemFeature('골프장',name);

  clearSelectedSystemIcons();
  hideHover();
  if(state.clickInfo){state.clickInfo.close();state.clickInfo=null}

  setDbStatus(`${g.name} 위치 확인 중…`);

  const token=(state.mapActionToken||0)+1;
  state.mapActionToken=token;
  const location=await resolveGolfLocationPromise(g);

  if(state.mapActionToken!==token)return;

  if(!location){
    setDbStatus(`${g.name} 위치를 찾지 못했습니다.`);
    alert(`${g.name} 위치를 지도에서 찾지 못했습니다.`);
    return;
  }

  const marker=createGolfMarker(g,location,false);
  addGolfRangeRing(location,g);
  state.rangeSelectionKey=`golf:${state.city}:${g.name}`;

  // 이동 완료 후 확대까지 모두 easing으로 처리
  focusRangeLocation(location,1);
  closeAreaPanel();
  setDbStatus(`${g.name} 선택됨`,true);


}

function jumpToPoi(name){
  cancelPendingMapWork();
  const actionToken=state.mapActionToken;

  clearSelectionRanges();
  clearAreaLabels();

  const p=currentPoints().find(x=>x.name===name);
  if(!p){
    setDbStatus(`"${name}" 위치 데이터를 찾지 못했습니다.`);
    return;
  }
  if(!state.map){
    setDbStatus('지도가 아직 준비되지 않았습니다.');
    return;
  }

  selectSystemFeature(p.type,name);

  clearSelectedSystemIcons();
  closeSystemInfo();

  resolvePoiLocation(p,(location)=>{
    if(state.mapActionToken!==actionToken)return;
    if(!location)return;

    createSelectedPoiMarker(p,location,false);

    clearSelectionRanges(false);
    addUnifiedPointRange(p.type,location,p);
    state.rangeSelectionKey=`poi:${state.city}:${p.name}`;

    focusRangeLocation(location,1);
    closeAreaPanel();
    setDbStatus(`${p.name} 선택됨`,true);
  });
}


function navDef(id){
  return NAV_CATEGORIES.find(x=>x.id===id);
}
