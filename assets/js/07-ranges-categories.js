function rangeViewportPadding(padding=78){
  const result={top:padding,bottom:padding,left:padding,right:padding};
  const mapRect=state.map?.getDiv?.()?.getBoundingClientRect?.();
  const legendRect=$('#areaLegend')?.getBoundingClientRect?.();
  if(mapRect && legendRect && legendRect.width>0 && legendRect.height>0 && legendRect.top<mapRect.bottom && legendRect.bottom>mapRect.top){
    result.bottom=Math.max(padding,Math.min(mapRect.height-140,mapRect.bottom-legendRect.top+16));
  }
  return result;
}

function estimateBoundsZoom(bounds,padding=78,maxZoom=16){
  if(!state.map || !bounds || bounds.isEmpty())return null;

  const ne=bounds.getNorthEast();
  const sw=bounds.getSouthWest();
  const div=state.map.getDiv();

  const inset=rangeViewportPadding(padding);
  const width=Math.max(140,(div?.clientWidth||800)-inset.left-inset.right);
  const height=Math.max(140,(div?.clientHeight||600)-inset.top-inset.bottom);

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
  // Keep the complete range above the floating category panel.
  const inset=rangeViewportPadding(padding);
  const offsetY=(inset.bottom-inset.top)/2/(256*Math.pow(2,targetZoom));
  targetCenter.lat=Math.atan(Math.sinh(Math.PI*(1-2*(mercatorY(targetCenter.lat)+offsetY))))*180/Math.PI;

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
  // One radius policy per place type, shared by registered and built-in places.
  return ({shopping:180,market:250,attraction:300,golf:700})[categoryId]||150;
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


function addUnifiedPointRange(type,location,p=null){
  return addPointCoverageCircle(type,location,p);
}

function addPointCoverageCircle(type,location,p=null){
  return addSelectionCircle(location,pointCircleRadius(type,p),poiColor(type),.08,.7,{...p,type,...location});
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
    const circle=addSelectionCircle(loc,businessCircleRadius(p.category),categoryRangeColor(p.category),.065,.68,p);
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
      const circle=addSelectionCircle(loc,radius,color,.065,.68,p);
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
  return addSelectionCircle(location,businessCircleRadius('golf'),categoryRangeColor('golf'),.08,.7,{...g,type:'골프장',...location});
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

  bindMapFeatureInfo(marker,{...g,type:'골프장',...location},location);

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

    // Fit exactly the same geographic radius that is rendered.
    extendBoundsByCircle(bounds,location,businessCircleRadius('golf'));
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

  fitCircleGeometry(location,businessCircleRadius('golf'),{padding:82,maxZoom:16});
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

    fitCircleGeometry(location,pointCircleRadius(p.type,p),{padding:82,maxZoom:16});
    closeAreaPanel();
    setDbStatus(`${p.name} 선택됨`,true);
  });
}


function navDef(id){
  return NAV_CATEGORIES.find(x=>x.id===id);
}
