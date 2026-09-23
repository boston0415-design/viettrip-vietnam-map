/* One set of browsing conditions for map and list; edits are applied together. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const ratings={all:'평점 전체','3plus':'3점 이상','4plus':'4점 이상','4.5':'4.5점 이상','5':'5점','1':'1점대','2':'2점대','3':'3점대','4':'4~4.5점 미만'};
  const benefits={all:'전체 업소',benefit:'혜택업소',recommended:'강추업소'};
  const wrap=document.querySelector('.mapwrap');if(!wrap)return;
  const tools=document.createElement('nav');tools.className='browseTools';tools.setAttribute('aria-label','업소 찾기 조건');
  tools.innerHTML='<div class="browseFilterButtons">'+[['city','지역'],['category','업종'],['rating','평점'],['benefit','혜택']].map(([key,label])=>`<button type="button" data-browse-filter="${key}" aria-haspopup="dialog"><small>${label}</small><strong></strong><span aria-hidden="true">⌄</span></button>`).join('')+'</div><div class="browseResultBar"><button id="browseShowList" type="button">업소 목록</button><span id="browseConditions"></span><button id="browseClear" type="button" hidden>초기화</button></div>';
  wrap.append(tools);
  const dialog=document.createElement('dialog');dialog.id='browseFilterDialog';dialog.className='travellerDialog browseFilterDialog';dialog.setAttribute('data-no-sheet-resize','');dialog.setAttribute('aria-labelledby','browseFilterTitle');
  dialog.innerHTML='<div class="browseDialogHead"><div><h2 id="browseFilterTitle">어떤 업소를 찾으세요?</h2><p>지역부터 고르고, 조건을 함께 적용하세요.</p></div><button type="button" id="browseFilterClose" aria-label="찾기 조건 닫기">×</button></div><form id="browseFilterForm"><div class="browseFields"><label>지역<select id="browseCity"></select></label><label>업종<select id="browseCategory"></select></label><label>세부 업종<select id="browseSub"></select></label><label>회원 평점<select id="browseRating"></select></label><label>혜택·추천<select id="browseBenefit"></select></label><label>정렬<select id="browseSort"><option value="newest">최근 등록순</option><option value="rating">평점 높은순</option><option value="reviews">후기 많은순</option><option value="name">이름순</option><option value="distance">가까운 순</option></select></label><label class="browseWide">동네·주소·업소명<input id="browseQuery" type="search" maxlength="200" placeholder="예: 푸미흥, 미딩, 업소 이름"></label><label id="browseTagField" class="browseWide">식당 메뉴<select id="browseTag"></select></label><p id="browseNearbyNote" class="browseWide" hidden></p></div><div class="browseDialogFoot"><button type="button" id="browseReset">조건 초기화</button><button type="submit" id="browseApply">업소 보기</button><p id="browsePreview" role="status" aria-live="polite"></p></div></form>';
  document.body.append(dialog);
  const options=values=>values.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
  el('browseCity').innerHTML=options([['all','전체 지역'],...Object.entries(CITY_DATA).map(([k,v])=>[k,v.label])]);
  el('browseCategory').innerHTML=options([['all','전체 업종'],...Object.entries(CONFIG.categories).map(([k,v])=>[k,v.label])]);
  el('browseRating').innerHTML=options(['all','3plus','4plus','4.5','5','1','2','3','4'].map(key=>[key,ratings[key]]));el('browseBenefit').innerHTML=options(Object.entries(benefits));
  el('browseTag').innerHTML=options([['all','전체 메뉴'],...RESTAURANT_TAGS.map(t=>[t,t])]);
  function subOptions(value='all'){
    const category=el('browseCategory').value;
    el('browseSub').innerHTML=options([['all','전체'],...(CONFIG.categories[category]?.subs||[]).map(s=>[s,s])]);el('browseSub').value=value;
    if(!el('browseSub').value)el('browseSub').value='all';
    el('browseSub').disabled=category==='all';el('browseTagField').hidden=category!=='restaurant';
  }
  function draft(){return {city:el('browseCity').value,cat:el('browseCategory').value,sub:el('browseSub').value,ratingFilter:el('browseRating').value,benefitFilter:el('browseBenefit').value,sort:el('browseSort').value,query:el('browseQuery').value.trim(),restaurantTag:el('browseCategory').value==='restaurant'?el('browseTag').value:'all'};}
  function matching(d){
    let rows=db().places.filter(p=>CONFIG.categories[p.category]&&p.subcategory!=='프라이빗 룸'&&placeInCity(p,d.city));
    rows=rows.filter(p=>(d.cat==='all'||p.category===d.cat)&&(d.sub==='all'||p.subcategory===d.sub||normalizedRestaurantSub(p.subcategory)===d.sub))
      .filter(p=>matchesRatingFilter(stats(p.id).rating,d.ratingFilter)&&matchesBenefitFilter(p,d.benefitFilter))
      .filter(p=>d.cat!=='restaurant'||d.restaurantTag==='all'||hasRestaurantTag(p,d.restaurantTag))
      .filter(p=>!d.query||matchesBusinessQuery(p,d.query));
    if(state.nearby&&d.city===state.city)rows=rows.filter(p=>validMapLocation(p)&&geoDistanceMeters(state.nearby,p)<=state.nearby.radius);
    return rows.filter(p=>!window.PersonalPlaces?.isHidden(p.id));
  }
  function preview(){
    const d=draft(),count=matching(d).length;
    el('browseApply').textContent=`${count}곳 보기`;
    el('browsePreview').textContent=state.sharedDbLoading?'업소를 불러오고 있습니다.':count?'지도와 목록에 같은 조건이 적용됩니다.':'조건에 맞는 업소가 없습니다. 지역이나 조건을 넓혀보세요.';
    el('browseNearbyNote').hidden=!state.nearby;
    if(state.nearby)el('browseNearbyNote').textContent=d.city===state.city?`${state.nearby.name} 주변 반경 ${state.nearby.radius/1000}km 내에서 찾습니다.`:'지역을 변경하면 주변 반경 검색은 해제됩니다.';
    const distance=el('browseSort').querySelector('[value="distance"]');distance.disabled=!state.nearby||d.city!==state.city;
    if(distance.disabled&&d.sort==='distance')el('browseSort').value='newest';
  }
  function open(key='city'){
    el('browseCity').value=state.city;el('browseCategory').value=state.cat;subOptions(state.sub);
    el('browseRating').value=state.ratingFilter;el('browseBenefit').value=state.benefitFilter;el('browseSort').value=state.sort;el('browseQuery').value=state.query;el('browseTag').value=state.restaurantTag;
    preview();if(!dialog.open)dialog.showModal();
    const id={city:'browseCity',category:'browseCategory',rating:'browseRating',benefit:'browseBenefit'}[key];el(id)?.focus({preventScroll:true});
  }
  function showList(){
    if(state.selected)closeDetailPanel();
    if(isMobileMapLayout())openMobileBusinessList();else if(document.querySelector('.content')?.classList.contains('desktopListCollapsed'))el('desktopListToggle')?.click();
    window.MapUX?.syncNearby();
  }
  function apply(d){
    if(d.city!==state.city)switchCity(d.city);
    cancelPendingMapWork();clearSelectionRanges();clearAreaLabels();clearSelectedSystemIcons();clearSearchMarker();closeSystemInfo();closeDetailPanel();
    state.navCategory=null;state.selectedNavItem=null;state.areaType='all';state.hospitalSpecialty='all';
    window.PersonalPlaces?.setView('all');Object.assign(state,d);
    el('searchInput').value=d.query;
    setMobileLegendExpanded(false);renderAll();renderHierarchyNav();renderCityControls();renderRatingFilterState();
    if(dialog.open)dialog.close();showList();el('businessSide').scrollTop=0;sync();
    // Fit multiple results without selecting or dismissing a business on map idle.
    const rows=items().filter(validMapLocation);
    if(state.map&&window.google?.maps?.LatLngBounds&&rows.length){
      const bounds=new google.maps.LatLngBounds();rows.forEach(p=>bounds.extend({lat:Number(p.lat),lng:Number(p.lng)}));
      state.map.fitBounds(bounds,{top:100,bottom:isMobileMapLayout()?Math.round(el('businessSide').getBoundingClientRect().height)+30:45,left:isMobileMapLayout()?30:420,right:35});
      if(rows.length===1&&state.map.getZoom()>16)state.map.setZoom(16);
    }
  }
  function resetForm(){el('browseCity').value='all';el('browseCategory').value='all';subOptions();for(const id of ['browseRating','browseBenefit','browseTag'])el(id).value='all';el('browseSort').value='newest';el('browseQuery').value='';preview();}
  function sync(){
    const labels={city:CITY_DATA[state.city]?.label||'전체 지역',category:state.cat==='all'?'전체 업종':catLabel(state.cat),rating:ratings[state.ratingFilter]||'평점 전체',benefit:benefits[state.benefitFilter]||'전체 업소'};
    tools.querySelectorAll('[data-browse-filter]').forEach(b=>{const key=b.dataset.browseFilter;b.querySelector('strong').textContent=labels[key];b.classList.toggle('isSet',key==='city'?state.city!=='all':key==='category'?state.cat!=='all':key==='rating'?state.ratingFilter!=='all':state.benefitFilter!=='all');});
    const count=items({forList:true}).length;el('browseShowList').textContent=`업소 목록 ${count}곳`;
    el('browseConditions').textContent=[state.sub!=='all'?state.sub:'',state.query?`“${state.query}”`:'',state.nearby?'주변 검색':''].filter(Boolean).join(' · ');
    el('browseClear').hidden=state.cat==='all'&&state.sub==='all'&&state.ratingFilter==='all'&&state.benefitFilter==='all'&&!state.query&&!state.navCategory&&!state.nearby;
    if(el('browseListCount'))el('browseListCount').textContent=`${count}곳`;
  }
  el('browseFilterClose').onclick=()=>dialog.close();el('browseReset').onclick=resetForm;el('browseShowList').onclick=showList;
  el('browseClear').onclick=()=>{window.NearbyBusinesses?.clear({refresh:false});apply({city:state.city,cat:'all',sub:'all',ratingFilter:'all',benefitFilter:'all',query:'',restaurantTag:'all',sort:'newest'});};
  el('browseCategory').onchange=()=>{subOptions();preview();};dialog.addEventListener('input',preview);dialog.addEventListener('change',preview);
  el('browseFilterForm').onsubmit=e=>{e.preventDefault();apply(draft());};
  tools.addEventListener('click',e=>{const b=e.target.closest('[data-browse-filter]');if(b)open(b.dataset.browseFilter);});
  const count=document.createElement('small');count.id='browseListCount';el('businessSide').querySelector('.mobileSideHead strong').append(count);
  const find=document.createElement('button');find.type='button';find.className='browseListFilters';find.textContent='필터';find.onclick=()=>open();el('mobileFilterToggle').before(find);
  // Existing entry points open the same controls instead of a second hidden filter UI.
  el('listSharedFilters').addEventListener('click',e=>{e.stopImmediatePropagation();open();},true);
  document.addEventListener('map-data-saved',sync);
  window.BrowseExperience={open,sync,matching};sync();
})();
