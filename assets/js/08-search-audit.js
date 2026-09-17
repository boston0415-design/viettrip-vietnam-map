function auditCategoryCityIsolation(){
  const result={city:state.city,categories:{}};

  NAV_CATEGORIES.forEach(def=>{
    if(def.kind==='business'){
      result.categories[def.id]=placesForCurrentCity().filter(p=>p.category===def.id).length;
    }else if(def.kind==='shopping'){
      result.categories[def.id]={
        system:currentPoints().filter(p=>p.type==='쇼핑').length,
        registered:placesForCurrentCity().filter(p=>p.category==='shopping').length
      };
    }else if(def.kind==='area'){
      result.categories[def.id]=currentAreas().filter(a=>normalizeAreaType(a)===def.type).length;
    }else if(def.kind==='airport'){
      result.categories[def.id]=currentPoints().filter(p=>['공항','그랩승차','택시승차','터미널','그린SM승차','버스승차'].includes(p.type)).length;
    }else if(def.id==='metro'){
      result.categories[def.id]=currentPoints().filter(p=>p.type==='전철역').length;
    }else if(def.kind==='point'){
      result.categories[def.id]=currentPoints().filter(p=>p.type===def.type).length;
    }else if(def.kind==='golf'){
      result.categories[def.id]=currentGolf().length;
    }
  });

  return result;
}



function isAirportTerminalPoint(p){
  const n=String(p.name||'');
  if(p.type!=='터미널')return false;
  if(/버스터미널|페리터미널/.test(n))return false;
  return /T1|T2|T3|공항|국내선|국제선|여객터미널/.test(n);
}

function isAirportMainPoint(p){
  const n=String(p.name||'');
  if(p.type!=='공항')return false;
  return !/버스|셔틀/.test(n);
}

function airportGroupPoints(group='all'){
  const points=currentPoints();

  if(group==='airport') return points.filter(isAirportMainPoint);
  if(group==='grab') return points.filter(p=>p.type==='그랩승차');
  if(group==='green') return points.filter(p=>p.type==='그린SM승차');
  if(group==='bus') return points.filter(p=>p.type==='버스승차');
  if(group==='taxi') return points.filter(p=>p.type==='택시승차');
  if(group==='terminal') return points.filter(isAirportTerminalPoint);

  return points.filter(p=>
    isAirportMainPoint(p) ||
    p.type==='그랩승차' ||
    p.type==='택시승차' || p.type==='그린SM승차' || p.type==='버스승차' ||
    isAirportTerminalPoint(p)
  );
}

async function showAirportGroup(group='all'){
  cancelPendingMapWork();
  const points=airportGroupPoints(group);

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

    // 전체: 공항 본체의 큰 범위만.
    // 소분류: 각 해당 지점 범위를 표시.
    if(group!=='all' || p.type==='공항'){
      addUnifiedPointRange(p.type,location,p);
      extendBoundsByCircle(bounds,location,pointCircleRadius(p.type,p));
    }else{
      // 마커는 지도에 보이되 화면 맞춤에는 위치를 포함.
      bounds.extend(location);
    }

    shown++;
  });

  if(shown){
    fitUnifiedBounds(bounds,{padding:86,maxZoom:16});
  }

  state.rangeSelectionKey=`airport:${state.city}:${group}`;
}

function showAirportCategory(){
  showAirportGroup('all');
}

function subItemsForNav(def){
  if(!def)return [];

  if(def.id==='airport'){
    return [
      {label:'전체',kind:'point-group',value:'all'},
      {label:'공항',kind:'point-group',value:'airport'},
      {label:'Grab',kind:'point-group',value:'grab'},
      {label:'택시',kind:'point-group',value:'taxi'},
      ...(airportGroupPoints('green').length?[{label:'Green SM',kind:'point-group',value:'green'}]:[]),
      ...(airportGroupPoints('bus').length?[{label:'버스·셔틀',kind:'point-group',value:'bus'}]:[]),
      {label:'터미널',kind:'point-group',value:'terminal'}
    ];
  }

  if(def.kind==='business'){
    const cfg=CONFIG.categories[def.id];
    return cfg ? cfg.subs.map(s=>({label:s,kind:'business-sub',value:s})) : [];
  }

  if(def.kind==='area'){
    return currentAreas()
      .filter(a=>normalizeAreaType(a)===def.type)
      .map(a=>({label:a.name,kind:'area',value:a.name}));
  }

  if(def.kind==='point' || def.kind==='shopping'){
    return currentPoints()
      .filter(p=>p.type===def.type)
      .map(p=>({label:p.name,kind:'point',value:p.name,pointType:p.type}));
  }

  if(def.kind==='golf'){
    return currentGolf().map(g=>({label:g.name,kind:'golf',value:g.name}));
  }

  return [];
}

function renderHierarchyNav(){
  syncMapFilterSummary();
  $('#quickAreas').innerHTML=
    `<span class="quickLabel">분류</span>`+
    NAV_CATEGORIES.map(c=>
      `<button type="button" aria-pressed="${state.navCategory===c.id?'true':'false'}" class="navCat ${state.navCategory===c.id?'active':''}" data-nav-cat="${c.id}">${c.label}</button>`
    ).join('');

  document.querySelectorAll('[data-nav-cat]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      resetIndependentBusinessFilters();
      const id=btn.dataset.navCat;
      state.navCategory=id;
      state.selectedNavItem=null;
      state.restaurantTag='all';
      const def=navDef(id);
      setDbStatus(`${def?.label||'분류'} 불러오는 중…`);
      if(def?.kind==='business') state.selectedNavItem='__all__';

      if(def?.kind==='shopping'){
        state.areaType='all';
        state.cat='shopping';
        state.sub='all';
        clearSelectionRanges();
        clearAreaLabels();
        clearSelectedSystemIcons();
        renderAll();
        showShoppingCategory();
      }else if(def?.kind==='business'){
        state.areaType='all';
        focusBusinessCategory(def.id,'all');
      }else{
        state.cat='all';
        state.sub='all';
        state.areaType=def?.type||'all';
        clearSelectedSystemIcons();
        renderAll();

        if(def?.kind==='area'){
          if(state.clickInfo){
            state.clickInfo.close();
            state.clickInfo=null;
          }
          clearSelectedSystemIcons();
          showTypeRanges(def.type);
        }else if(def?.kind==='airport'){
          state.selectedNavItem='all';
          showAirportCategory();
        }else if(def?.id==='metro'){
          showMetroCategory();
        }else if(def?.kind==='point'){
          showPointCategory(def.type);
        }else if(def?.kind==='golf'){
          showGolfCategory();
        }else{
          clearSelectionRanges();
          clearSelectedSystemIcons();
        }
      }

      renderHierarchyNav();
    });
  });

  const def=navDef(state.navCategory);
  const subs=subItemsForNav(def);

  if(!def){
    $('#subNav').classList.remove('show');
    $('#subNav').innerHTML='';
    $('#tagNav').classList.remove('show');
    $('#tagNav').innerHTML='';
    return;
  }

  const allButton = def.kind==='business'
    ? `<button type="button" aria-pressed="${state.sub==='all'?'true':'false'}" class="navSub ${state.sub==='all'?'active':''}" data-business-sub="all">전체</button>`
    : '';

  $('#subNav').classList.add('show');
  $('#subNav').innerHTML=
    `<span class="quickLabel">${def.label} ›</span>`+
    allButton+
    subs.map(s=>{
      if(s.kind==='business-sub'){
        const shoppingExamples={
          '마트':'마트 · 롯데마트 등',
          '쇼핑몰':'쇼핑몰 · Vincom 등',
          '백화점':'백화점',
          '아울렛':'아울렛'
        };
        const label=(def.id==='shopping' ? (shoppingExamples[s.label]||s.label) : s.label);
        return `<button type="button" aria-pressed="${state.sub===s.value?'true':'false'}" class="navSub ${state.sub===s.value?'active':''}" data-business-sub="${s.value}">${label}</button>`;
      }
      if(s.kind==='area'){
        return `<button type="button" aria-pressed="${state.selectedNavItem===s.value?'true':'false'}" class="navSub ${state.selectedNavItem===s.value?'active':''}" data-nav-area="${s.value}">${s.label}</button>`;
      }
      if(s.kind==='point-group'){
        return `<button type="button" aria-pressed="${state.selectedNavItem===s.value?'true':'false'}" class="navSub ${state.selectedNavItem===s.value?'active':''}" data-point-group="${s.value}">${s.label}</button>`;
      }
      if(s.kind==='point'){
        return `<button type="button" aria-pressed="${state.selectedNavItem===s.value?'true':'false'}" class="navSub ${s.pointType==='그랩승차'?'grabPickup':''} ${state.selectedNavItem===s.value?'active':''}" data-nav-point="${s.value}">${s.pointType==='그랩승차'?'G · ':''}${s.label}</button>`;
      }
      return `<button type="button" aria-pressed="${state.selectedNavItem===s.value?'true':'false'}" class="navSub ${state.selectedNavItem===s.value?'active':''}" data-nav-golf="${s.value}">${s.label}</button>`;
    }).join('');


  if(def.id==='restaurant'){
    $('#tagNav').classList.add('show');
    $('#tagNav').innerHTML=
      `<span class="quickLabel">특징 ›</span>`+
      `<button type="button" aria-pressed="${state.restaurantTag==='all'?'true':'false'}" class="navSub ${state.restaurantTag==='all'?'active':''}" data-restaurant-tag="all">전체</button>`+
      RESTAURANT_TAGS.map(tag=>
        `<button type="button" aria-pressed="${state.restaurantTag===tag?'true':'false'}" class="navSub ${state.restaurantTag===tag?'active':''}" data-restaurant-tag="${tag}">${tag}</button>`
      ).join('');
  }else{
    $('#tagNav').classList.remove('show');
    $('#tagNav').innerHTML='';
  }

  document.querySelectorAll('[data-business-sub]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      resetIndependentBusinessFilters();
      const sub=btn.dataset.businessSub;
      state.selectedNavItem=sub==='all' ? '__all__' : sub;
      state.sub=sub;
      renderHierarchyNav();
      focusBusinessCategory(state.cat,sub);
    });
  });


  document.querySelectorAll('[data-restaurant-tag]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      resetIndependentBusinessFilters();
      state.restaurantTag=btn.dataset.restaurantTag;
      renderHierarchyNav();
      focusBusinessCategory('restaurant',state.sub);
    });
  });

  document.querySelectorAll('[data-nav-area]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      const value=btn.dataset.navArea;
      state.selectedNavItem=value;
      renderHierarchyNav();

      clearSelectionRanges();
      renderAll();
      clearSelectedSystemIcons();
      jumpToPopularArea(value,false);
    });
  });

  document.querySelectorAll('[data-point-group]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      const group=btn.dataset.pointGroup;
      state.selectedNavItem=group;
      renderHierarchyNav();
      showAirportGroup(group);
    });
  });

  document.querySelectorAll('[data-nav-point]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      const pointName=btn.dataset.navPoint;
      state.selectedNavItem=pointName;

      // 클릭 즉시 선택색 표시
      renderHierarchyNav();

      if(state.navCategory==='shopping'){
        // 등록 업체 마커와 쇼핑 전체 마커를 모두 지우고 선택한 장소만 표시
        state.cat='shopping';
        state.sub='all';
        clearBusinessMarkersOnly();
        clearSelectedSystemIcons();
      }

      renderAll();
      jumpToPoi(pointName);
    });
  });

  document.querySelectorAll('[data-nav-golf]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      const golfName=btn.dataset.navGolf;
      state.selectedNavItem=golfName;
      renderHierarchyNav();
      renderAll();
      setDbStatus(`${golfName} 선택 중…`);
      jumpToGolf(golfName);
    });
  });
}

function renderCityControls(){
  const city=currentCity();
  $('#activeCityName').textContent=city.label;
  $('#areaPanelTitle').textContent=`${city.label} 주요정보`;

  $('#cityChips').innerHTML=
    `<span class="quickLabel">대분류</span>`+
    Object.entries(CITY_DATA).map(([key,c])=>
      `<button type="button" class="cityChip ${state.city===key?'active':''}" data-city="${key}">${c.label}</button>`
    ).join('');

  document.querySelectorAll('[data-city]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      switchCity(btn.dataset.city);
    });
  });

  renderHierarchyNav();
}


function fitSelectedCityView(key){
  if(!state.map || !CITY_DATA[key])return;

  const city=CITY_DATA[key];
  const extra=EXTRA_DATA[key]||{};
  const areas=[...(city.areas||[]),...(extra.zones||[])];
  const points=extra.points||[];
  const golf=(city.golf||[]);

  const bounds=new google.maps.LatLngBounds();
  let hasGeometry=false;

  const extendPoint=(pt)=>{
    const location=validMapLocation(pt);
    if(location){
      bounds.extend(location);
      hasGeometry=true;
    }
  };

  extendPoint(city.center);

  areas.forEach(a=>{
    if(a.center)extendPoint(a.center);
    if(validMapLocation(a.center)){
      extendBoundsByCircle(bounds,a.center,areaRangeRadius(a));
    }
  });

  points.forEach(extendPoint);
  golf.forEach(extendPoint);

  if(hasGeometry){
    const maxCityZoom=key==='hanoi'?12.4:12.8;
    return smoothFitBounds(bounds,{padding:82,maxZoom:maxCityZoom,duration:620});
  }

  return focusRangeLocation(city.center,0);
}

function switchCity(key){
  if(!CITY_DATA[key])return;
  if(typeof resetAdministrativeRegions==='function')resetAdministrativeRegions();

  cancelPendingMapWork();

  clearAreaLabels();
  clearSelectedSystemIcons();
  clearSelectionRanges();

  state.city=key;
  state.navCategory=null;
  state.selectedNavItem=null;
  state.areaType='all';
  state.cat='all';
  state.sub='all';
  state.query='';
  state.ratingFilter='all';
  state.benefitFilter='all';
  state.restaurantTag='all';
  state.selected=null;

  if($('#searchInput'))$('#searchInput').value='';

  const c=currentCity();

  if(state.map){
    if(state.clickInfo){
      state.clickInfo.close();
      state.clickInfo=null;
    }
    if(state.hoverInfo)state.hoverInfo.close();

    fitSelectedCityView(key);
    showCityRange(key,`city:${key}`);
  }

  // 도시를 바꿀 때 업체 목록·마커·상세까지 전부 새 도시 기준으로 다시 그림.
  renderCityControls();
  renderRatingFilterState();
  renderAll();
  renderAreaList();
  renderPopularAreas();
  setDbStatus(`${c.label} 주요정보`,true);
}
function renderAreaList(){
  const city=currentCity();

  $('#typeFilters').innerHTML=AREA_TYPES.map(([id,label])=>
    `<button type="button" class="typeChip ${state.areaType===id?'active':''}" data-area-type="${id}">${label}</button>`
  ).join('');
  document.querySelectorAll('[data-area-type]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      cancelPendingMapWork();
      resetIndependentBusinessFilters();
      state.areaType=btn.dataset.areaType;
      const def=NAV_CATEGORIES.find(d=>d.type===state.areaType);
      state.navCategory=def?.id||null;
      state.selectedNavItem=null;
      state.cat='all';state.sub='all';
      clearSelectedSystemIcons();
      clearSelectionRanges();
      renderAll();
      renderHierarchyNav();
      if(state.clickInfo){
        state.clickInfo.close();
        state.clickInfo=null;
      }
      $('#areaPanelTitle').textContent=`${currentCity().label} · ${AREA_TYPES.find(x=>x[0]===state.areaType)?.[1]||state.areaType}`;
      renderAreaList();

      if(['거리','시장','관광명소','한인생활권'].includes(state.areaType)){
        clearSelectedSystemIcons();
        showTypeRanges(state.areaType);
      }else if(state.areaType==='골프장'){
        showGolfCategory();
      }else if(state.areaType==='공항'){
        showAirportCategory();
      }else if(state.areaType==='전철역'){
        showMetroCategory();
      }else if(['기차역','병원'].includes(state.areaType)){
        showPointCategory(state.areaType);
      }else if(state.areaType==='all'){
        clearSelectedSystemIcons();
        showCityRange(state.city,`type:${state.city}:all`);
      }else{
        clearSelectionRanges();
        clearSelectedSystemIcons();
      }
    });
  });

  const allRows=[];

  currentAreas().forEach(a=>{
    allRows.push({
      kind:'area',
      name:a.name,
      type:normalizeAreaType(a),
      desc:a.desc,
      color:a.color
    });
  });

  currentPoints().forEach(p=>{
    const airportFamily=isAirportMainPoint(p)||isAirportTerminalPoint(p)||['그랩승차','택시승차','그린SM승차','버스승차'].includes(p.type);
    allRows.push({
      kind:'point',
      name:p.name,
      type:airportFamily?'공항':p.type,
      actualType:p.type,
      desc:p.desc,
      icon:p.icon||'•'
    });
  });

  currentGolf().forEach(g=>{
    allRows.push({
      kind:'golf',
      name:g.name,
      type:'골프장',
      desc:g.address,
      icon:'⛳'
    });
  });

  const filtered=state.areaType==='all'?allRows:allRows.filter(r=>r.type===state.areaType);

  const order=['거리','시장','공항','전철역','기차역','한인생활권','병원','관광명소','골프장'];
  const sections=order.map(type=>[type,filtered.filter(r=>r.type===type)]).filter(([,rows])=>rows.length);

  $('#areaList').innerHTML=sections.length?sections.map(([type,rows])=>`
    <div class="areaSectionTitle">${city.label} · ${type} (${rows.length})</div>
    ${rows.map(r=>`
      <button class="areaRow" type="button"
        ${r.kind==='area'?`data-area-row="${r.name}"`:r.kind==='golf'?`data-golf-row="${r.name}"`:`data-poi-row="${r.name}"`}>
        <div class="areaRowTop">
          ${r.kind==='area'?`<i class="sw" style="background:${r.color}66"></i>`:`<span>${r.icon||'•'}</span>`}
          <span>${r.name}</span>
          <span class="areaType">${r.actualType||r.type}</span>
        </div>
        <div class="areaRowDesc">${r.desc||''}</div>
      </button>
    `).join('')}
  `).join(''):'<div class="areaRowDesc" style="padding:12px">해당 분류의 위치가 아직 없습니다.</div>';

  document.querySelectorAll('[data-area-row]').forEach(btn=>{
    btn.addEventListener('click',()=>jumpToPopularArea(btn.dataset.areaRow,false));
  });
  document.querySelectorAll('[data-golf-row]').forEach(btn=>{
    btn.addEventListener('click',()=>jumpToGolf(btn.dataset.golfRow));
  });
  document.querySelectorAll('[data-poi-row]').forEach(btn=>{
    btn.addEventListener('click',()=>jumpToPoi(btn.dataset.poiRow));
  });
}


function isMobileMapLayout(){
  return window.matchMedia('(max-width: 900px)').matches;
}

function refreshMapAfterMobileLayout(){
  if(!state.map)return;
  const center=state.map.getCenter();
  requestAnimationFrame(()=>{
    google.maps.event.trigger(state.map,'resize');
    if(center)state.map.setCenter(center);
  });
}

function mapFilterSummary(){
  const def=navDef(state.navCategory);
  const parts=[currentCity().label];
  const category=def?.label || CONFIG.categories[state.cat]?.label;
  if(category)parts.push(category);
  if(state.sub && state.sub!=='all')parts.push(state.sub);
  const item=state.selectedNavItem;
  if(item && !['all','__all__',state.sub].includes(item)){
    const label=def?.id==='airport'
      ? ({airport:'공항',grab:'Grab',taxi:'택시',green:'Green SM',bus:'버스·셔틀',terminal:'터미널'}[item]||item)
      : item;
    parts.push(label);
  }
  if(state.restaurantTag && state.restaurantTag!=='all')parts.push(state.restaurantTag);
  if(state.ratingFilter && state.ratingFilter!=='all')parts.push(state.ratingFilter==='4.5'?'4.5★ 이상':`${state.ratingFilter}★`);
  if(state.benefitFilter && state.benefitFilter!=='all')parts.push('% 혜택');
  if(state.query)parts.push(`검색: ${state.query}`);
  if(parts.length===1)parts.push('전체');
  return parts;
}

function syncMapFilterSummary(){
  const title=$('#areaLegendTitle');
  if(!title)return;
  const parts=mapFilterSummary();
  const city=$('#activeCityName'),selection=$('#filterSelectionSummary');
  if(city)city.textContent=parts[0];
  if(selection)selection.textContent=` · ${parts.slice(1).join(' · ')}`;
  const expanded=!$('#areaLegend')?.classList.contains('mobileCollapsed');
  const full=parts.join(' · ');
  title.title=full;
  title.setAttribute('aria-label',`지도 필터 ${expanded?'접기':'열기'}: ${full}`);
}

// Both desktop and mobile share one disclosure state; filters and layers are untouched.
function setMobileLegendExpanded(expanded,{restoreFocus=false}={}){
  const legend=$('#areaLegend');
  if(!legend)return;
  const title=$('#areaLegendTitle'),body=$('#areaLegendBody');
  if(!expanded && (restoreFocus || body?.contains(document.activeElement)))title?.focus({preventScroll:true});
  legend.classList.toggle('mobileCollapsed',!expanded);
  if(body)body.hidden=!expanded;
  title?.setAttribute('aria-expanded',String(expanded));
  const label=title?.querySelector('.filterToggleLabel');
  if(label)label.textContent=expanded?'접기':'필터';
  if(expanded){
    closeAreaPanel();
    if($('#detail')?.classList.contains('show'))closeDetailPanel();
  }
  syncMapFilterSummary();
}

function collapseMobileLegend(){
  if(isMobileMapLayout())setMobileLegendExpanded(false);
}

function closeMobileBusinessList(){
  $('#businessSide')?.classList.remove('mobileOpen');
  $('.mapwrap')?.classList.remove('listOpen');
  refreshMapAfterMobileLayout();
}

function openMobileBusinessList(){
  if(!isMobileMapLayout())return;
  collapseMobileLegend();
  if(state.selected)closeDetailPanel();
  closeAreaPanel();
  $('#businessSide')?.classList.add('mobileOpen');
  $('.mapwrap')?.classList.add('listOpen');
  refreshMapAfterMobileLayout();
}

function syncMobileListCount(){
  const count=$('#mobileListCount');
  if(count)count.textContent=String(items({forList:true}).length);
}

function bindAreaNavigation(){
  const panel=$('#areaPanel');
  const title=$('#areaLegendTitle');
  const legend=$('#areaLegend');

  title.addEventListener('click',()=>{
    setMobileLegendExpanded(legend.classList.contains('mobileCollapsed'));
  });
  $('#closeMapFilters')?.addEventListener('click',()=>setMobileLegendExpanded(false,{restoreFocus:true}));
  $('#openAreaDirectory')?.addEventListener('click',()=>{
    setMobileLegendExpanded(false);
    panel.classList.add('show');
    $('#areaPanelClose')?.focus({preventScroll:true});
  });

  $('#areaPanelClose').addEventListener('click',()=>{
    panel.classList.remove('show');
    title.classList.remove('open');
    title.focus({preventScroll:true});
  });

  $('#mobileListBtn')?.addEventListener('click',openMobileBusinessList);
  $('#mobileListClose')?.addEventListener('click',closeMobileBusinessList);

  renderCityControls();
  renderAreaList();
  syncMobileListCount();

  setMobileLegendExpanded(false);
}

function renderPopularAreas(){
  // 기본 화면에서는 지역 범위를 표시하지 않습니다.
  // 지역/대분류/소분류를 클릭할 때 selectionOverlays로 필요한 범위만 표시합니다.
  clearPopularAreas();
}

function clearUserLocation(){
  if(state.userMarker){state.userMarker.setMap(null);state.userMarker=null}
  if(state.userAccuracyCircle){state.userAccuracyCircle.setMap(null);state.userAccuracyCircle=null}
  if(state.userInfo){state.userInfo.close();state.userInfo=null}
}

function showUserLocation(pos, autoZoom=true){
  if(!state.map)return;
  const lat=pos.coords.latitude;
  const lng=pos.coords.longitude;
  const accuracy=Math.max(1, Math.round(pos.coords.accuracy || 0));
  const point={lat,lng};

  if(!state.userMarker){
    state.userMarker=new google.maps.Marker({
      map:state.map,
      position:point,
      title:'내 현재 위치',
      zIndex:9999,
      icon:{
        path:google.maps.SymbolPath.CIRCLE,
        scale:9,
        fillColor:'#1a73e8',
        fillOpacity:1,
        strokeColor:'#ffffff',
        strokeWeight:1.5
      }
    });
  }else{
    state.userMarker.setPosition(point);
  }

  if(!state.userAccuracyCircle){
    state.userAccuracyCircle=new google.maps.Circle({
      map:state.map,
      center:point,
      radius:accuracy,
      fillColor:'#1a73e8',
      fillOpacity:.12,
      strokeColor:'#1a73e8',
      strokeOpacity:.34,
      strokeWeight:1,
      clickable:true,
      zIndex:1
    });
  }else{
    state.userAccuracyCircle.setCenter(point);
    state.userAccuracyCircle.setRadius(accuracy);
  }

  state.userLocationInfo={name:'내 현재 위치',type:'브라우저 위치',description:`정확도 약 ±${accuracy}m. 파란 원은 위치 오차 범위입니다.`,...point};
  if(!state.userInfo){
    state.userInfo=new google.maps.InfoWindow();
    for(const target of [state.userMarker,state.userAccuracyCircle]){
      target.addListener('mouseover',()=>{if(supportsMapHover())showPositionHover(state.userMarker.getPosition(),mapFeatureHtml(state.userLocationInfo))});
      target.addListener('mouseout',hideHover);
      target.addListener('click',()=>showClickInfo(state.userMarker.getPosition(),mapFeatureHtml(state.userLocationInfo)));
    }
  }

  if(autoZoom){
    cancelPendingMapWork();
    focusLocationAtZoom(point,17);
  }

  const btn=$('#locBtn');
  btn.textContent=`현재 위치 · ±${accuracy}m`;
  btn.title=`브라우저가 제공한 위치 정확도: 약 ±${accuracy}m`;
}
