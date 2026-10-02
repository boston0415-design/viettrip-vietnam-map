/* Road alerts are reviewed records, separate from places/reviews and weather. */
(() => {
  'use strict';
  const D=window.RoadConditionData,wrap=document.querySelector('.mapwrap'),bar=document.querySelector('.browseResultBar');
  if(!D||!wrap||!bar)return;
  const el=id=>document.getElementById(id),KEY='viettrip_road_layers_v1',LABEL={flood:'침수',construction:'공사·통제'};
  const pref={traffic:false,flood:true,construction:true};
  try{const saved=JSON.parse(safeStorageGet(KEY)||'null');for(const k of Object.keys(pref))if(typeof saved?.[k]==='boolean')pref[k]=saved[k];}catch{}
  let feed=null,loading=false,failed=false,lastFetch=0,controller=null,traffic=null,map=null,drawKey='',overlays=[],lastCity='';
  let picking=false,pickMarker=null,picked=null,reportPoint=null,oldCursor='',returnToReport=false;
  const openButton=document.createElement('button');openButton.id='roadConditionsOpen';openButton.type='button';openButton.textContent='도로 상황';openButton.setAttribute('aria-haspopup','dialog');openButton.setAttribute('aria-controls','roadConditionsDialog');bar.append(openButton);
  function makeDialog(id,title,body){
    const node=document.createElement('dialog');node.id=id;node.className='travellerDialog roadDialog';node.setAttribute('data-no-sheet-resize','');node.setAttribute('aria-labelledby',id+'Title');
    node.innerHTML=`<div class="roadDialogHead"><h2 id="${id}Title">${title}</h2><button type="button" data-road-close aria-label="${title} 닫기">×</button></div><div class="roadDialogBody">${body}</div>`;
    document.body.append(node);node.querySelector('[data-road-close]').onclick=()=>node.close();return node;
  }
  const dialog=makeDialog('roadConditionsDialog','도로 상황',`
    <p class="roadIntro">이동 전에 침수·공사 제보와 교통 흐름을 확인하세요.</p>
    <div class="roadLayers" role="group" aria-label="지도에 표시할 도로 정보">
      <label><input id="roadTraffic" type="checkbox">정체</label><label><input id="roadFlood" type="checkbox">침수</label><label><input id="roadConstruction" type="checkbox">공사</label>
    </div>
    <p class="roadLegend"><span><i style="background:#188038"></i>원활</span><span><i style="background:#f9ab00"></i>지연</span><span><i style="background:#c5221f"></i>정체</span></p>
    <p id="roadTrafficStatus" class="roadFeedStatus" role="status"></p>
    <p class="roadNotice">정체는 Google 제공 지역에 표시됩니다. 침수·공사는 운영자가 출처를 확인한 정보이며 모든 구간을 실시간 감시하지 않습니다. 표시가 없어도 안전한 도로라는 뜻은 아닙니다.</p>
    <p id="roadFeedStatus" class="roadFeedStatus" role="status" aria-live="polite"></p>
    <ul id="roadIncidentList" class="roadList" aria-label="확인된 도로 정보"></ul>
    <div class="roadActions"><button id="roadReportOpen" class="roadPrimary" type="button">침수·공사 제보</button><button id="roadRefresh" type="button">새로 확인</button></div>
    <p class="roadLegend">현장 상황과 안내 표지판을 우선 확인하세요. 비 효과는 침수 정보와 별개입니다.</p>`);
  const report=makeDialog('roadReportDialog','침수·공사 제보',`
    <p class="roadIntro">위치와 현장 상황을 정리해 카페에 올려주세요. 운영자 확인 후 지도에 반영합니다.</p>
    <form id="roadReportForm" class="roadForm" autocomplete="off">
      <label>상황<select id="roadReportKind"><option value="flood">침수</option><option value="construction">공사·통제</option></select></label>
      <label>지역<select id="roadReportCity" required></select></label>
      <label>도로·교차로 이름<input id="roadReportName" type="text" required maxlength="120" placeholder="예: 응우옌흐우토와 응우옌반린 교차로"></label>
      <div><button id="roadReportPick" type="button">지도에서 위치 선택</button><span id="roadReportLocation" class="roadLocation">아직 위치를 선택하지 않았습니다.</span></div>
      <label>직접 확인한 시각 (베트남 시간)<input id="roadReportTime" type="datetime-local" required></label>
      <label>현장 상황<textarea id="roadReportBody" required minlength="10" maxlength="700" placeholder="어느 방향인지, 통행이 가능한지 적어주세요. 사진은 카페 글에 첨부해 주세요."></textarea></label>
      <label>관련 공지·제보 링크 (선택)<input id="roadReportSource" type="url" maxlength="1500" placeholder="https://"></label>
      <button class="roadPrimary" type="submit">제보 내용 복사</button>
    </form>
    <p id="roadDraftStatus" role="status" aria-live="polite"></p>
    <div id="roadDraftResult" hidden><label for="roadDraftText">카페에 붙여넣을 내용</label><textarea id="roadDraftText" readonly></textarea><div class="roadActions"><a class="roadLink" href="https://cafe.naver.com/talkvietnam" target="_blank" rel="noopener noreferrer">카페에 제보하러 가기 ↗</a></div></div>`);
  for(const [value,city] of Object.entries(CITY_DATA)){const option=document.createElement('option');option.value=value;option.textContent=city.label;el('roadReportCity').append(option);}
  const picker=document.createElement('div');picker.id='roadPickControls';picker.hidden=true;picker.setAttribute('role','region');picker.setAttribute('aria-label','도로 제보 위치 선택');
  picker.innerHTML='<p id="roadPickHint" role="status">제보할 도로를 지도에서 눌러주세요. 확대·이동할 수 있습니다.</p><div><button type="button" id="roadPickCancel">취소</button><button type="button" id="roadPickConfirm" disabled>이 위치 사용</button></div>';wrap.append(picker);
  const date=v=>new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
  function rows(){return D.active(feed,Date.now(),state.city).filter(r=>pref[r.kind]&&CITY_DATA[r.city]);}
  function save(){safeStorageSet(KEY,JSON.stringify(pref));}
  function clear(){for(const overlay of overlays)overlay.setMap(null);overlays=[];drawKey='';}
  function markerIcon(kind){
    const shape=kind==='flood'?'<path d="M16 6c-3 4-7 8-7 12a7 7 0 0 0 14 0c0-4-4-8-7-12" fill="white"/>':'<path d="m16 6 11 20H5Z" fill="white"/><path d="M16 12v6m0 3v2" stroke="#a36516" stroke-width="2.5"/>';
    return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="9" fill="${kind==='flood'?'#286b9c':'#a36516'}" stroke="white" stroke-width="2"/>${shape}</svg>`),scaledSize:new google.maps.Size(34,34),anchor:new google.maps.Point(17,17)};
  }
  function draw(){
    if(!map||!window.google?.maps?.Marker)return;
    const visible=rows(),key=JSON.stringify(visible);
    if(drawKey===key)return;clear();drawKey=key;
    for(const row of visible){
      const color=row.kind==='flood'?'#286b9c':'#b57622',geometry=row.geometry,options={map,strokeColor:color,strokeWeight:5,strokeOpacity:.85,clickable:false,zIndex:3};
      const path=coordinates=>coordinates.map(([lng,lat])=>({lat,lng}));
      if(geometry.type==='LineString'&&google.maps.Polyline)overlays.push(new google.maps.Polyline({...options,path:path(geometry.coordinates)}));
      if(geometry.type==='Polygon'&&google.maps.Polygon)overlays.push(new google.maps.Polygon({...options,paths:path(geometry.coordinates[0]),fillColor:color,fillOpacity:.15,strokeWeight:2}));
      const pin=new google.maps.Marker({map,position:D.anchor(row),title:`${LABEL[row.kind]} · ${row.title}`,icon:markerIcon(row.kind),zIndex:9500});
      pin.addListener('click',()=>open(row.id));overlays.push(pin);
    }
  }
  function sync(){
    if(state.map!==map){traffic?.setMap(null);traffic=null;clear();map=state.map;}
    if(pref.traffic&&map&&window.google?.maps?.TrafficLayer&&!traffic)traffic=new google.maps.TrafficLayer({autoRefresh:true});
    if(traffic&&traffic.getMap?.()!==(pref.traffic?map:null))traffic.setMap(pref.traffic?map:null);
    el('roadTrafficStatus').textContent=!pref.traffic?'정체 표시 꺼짐':!map?'지도 준비 후 정체를 표시합니다.':!traffic?'교통정보를 연결하지 못했습니다. 잠시 후 다시 켜주세요.':'정체 표시 켜짐 · Google 제공 · 즉시 갱신되지 않을 수 있습니다.';
    openButton.setAttribute('aria-pressed',String(pref.traffic||rows().length>0));
    openButton.textContent=rows().length?`도로 상황 ${rows().length}`:'도로 상황';
    if(state.city!==lastCity){if(picking)cancelPick();lastCity=state.city;}
    draw();if(dialog.open)render();
  }
  function render(){
    const visible=rows(),list=el('roadIncidentList');list.replaceChildren();
    const place=CITY_DATA[state.city]?.label||'전체 지역';
    for(const row of visible){
      const card=document.createElement('li');card.className='roadIncident';card.dataset.roadId=row.id;
      const kind=document.createElement('span');kind.className='roadKind '+row.kind;kind.textContent=LABEL[row.kind];
      const title=document.createElement('h3');title.textContent=row.title;
      const description=document.createElement('p');description.textContent=row.description;
      const time=document.createElement('small');time.textContent=`현장·공지 기준 ${date(row.observedAt)} · 검토 ${date(row.verifiedAt)} · 표시 만료 ${date(row.expiresAt)} (베트남 시간)`;
      const source=document.createElement('a');source.href=D.sourceUrl(row.source.url);source.target='_blank';source.rel='noopener noreferrer';source.textContent=`${row.source.type==='official'?'공식 공지':'확인된 회원 제보'} · ${row.source.name} ↗`;
      const action=document.createElement('button');action.type='button';action.textContent='지도에서 보기';action.onclick=()=>{
        if(!state.map){el('roadFeedStatus').textContent='지도를 불러온 뒤 다시 눌러주세요.';return;}
        dialog.close();closeDetailPanel();closeMobileBusinessList();cancelPendingMapWork();state.map.panTo(D.anchor(row));state.map.setZoom(16);
      };
      card.append(kind,title,description,time,source,document.createElement('br'),action);list.append(card);
    }
    if(!visible.length){const empty=document.createElement('li');empty.className='roadEmpty';empty.textContent=!pref.flood&&!pref.construction?'침수와 공사 표시가 꺼져 있습니다.':feed?`${place}에 현재 표시할 확인된 침수·공사 정보가 없습니다.`:'침수·공사 정보를 아직 확인하지 못했습니다.';list.append(empty);}
    const status=el('roadFeedStatus');status.classList.toggle('isError',failed);
    status.textContent=loading?'도로 정보를 불러오는 중…':failed?(feed?'새 정보를 불러오지 못했습니다. 이전에 받은 정보 중 유효기간 내 항목만 표시합니다.':'도로 정보를 불러오지 못했습니다. ‘새로 확인’을 눌러주세요.'):feed?`${place} · ${visible.length}건 · 목록 갱신 ${date(feed.updatedAt)} (베트남 시간)`:'도로 정보 확인 대기';
    el('roadRefresh').disabled=loading;
  }
  async function refresh(force=false){
    if(loading||(!force&&Date.now()-lastFetch<300000))return;
    lastFetch=Date.now();loading=true;failed=false;render();
    controller=new AbortController();const request=controller,timer=setTimeout(()=>request.abort(),10000);
    try{
      const response=await fetch('./assets/data/road-conditions.json',{cache:'no-store',signal:request.signal});
      if(!response.ok)throw Error('feed unavailable');
      const raw=await response.text();if(raw.length>250000)throw Error('feed too large');
      const next=D.parse(JSON.parse(raw));if(Date.parse(next.updatedAt)>Date.now()+300000)throw Error('future feed');
      feed=next;
    }catch{failed=true;}finally{clearTimeout(timer);controller=null;loading=false;sync();render();}
  }
  function open(id){
    cancelPick();if(report.open)report.close();sync();render();if(!dialog.open)dialog.showModal();refresh();
    if(id){const card=[...el('roadIncidentList').children].find(n=>n.dataset.roadId===id);card?.scrollIntoView({block:'nearest'});}
  }
  function openReport(){
    if(dialog.open)dialog.close();
    if(!el('roadReportTime').value)el('roadReportTime').value=new Date(Date.now()+7*3600000).toISOString().slice(0,16);
    if(CITY_DATA[state.city]&&!reportPoint)el('roadReportCity').value=state.city;
    if(!report.open)report.showModal();
  }
  function clearDraft(){el('roadDraftResult').hidden=true;el('roadDraftText').value='';el('roadDraftStatus').textContent='';}
  function cancelPick(){
    const wasPicking=picking;picking=false;picked=null;picker.hidden=true;pickMarker?.setMap(null);pickMarker=null;el('roadPickConfirm').disabled=true;
    if(wasPicking)state.map?.setOptions?.({draggableCursor:oldCursor});
  }
  function startPick(){
    if(!state.map||!window.google?.maps?.Marker){el('roadDraftStatus').textContent='지도가 준비된 뒤 다시 눌러주세요.';return;}
    window.NearbyBusinesses?.cancelPick();if(state.registerMode)cancelRegisterMode();
    cancelPendingMapWork();closeSystemInfo();closeDetailPanel();closeAreaPanel();closeMobileBusinessList();setMobileLegendExpanded(false);
    returnToReport=true;report.close();oldCursor=state.map.get?.('draggableCursor')||'';state.map.setOptions?.({draggableCursor:'crosshair'});
    picking=true;picker.hidden=false;el('roadPickConfirm').disabled=true;el('roadPickHint').textContent='제보할 도로를 지도에서 눌러주세요. 확대·이동할 수 있습니다.';el('roadPickCancel').focus({preventScroll:true});
  }
  function handleMapClick(event){
    if(!picking)return false;event?.stop?.();
    const p=event?.latLng,lat=typeof p?.lat==='function'?p.lat():p?.lat,lng=typeof p?.lng==='function'?p.lng():p?.lng;
    if(!D.point([lng,lat])){el('roadPickHint').textContent='베트남 안의 도로를 선택해주세요.';return true;}
    picked={lat,lng};pickMarker?.setMap(null);pickMarker=new google.maps.Marker({map:state.map,position:picked,title:'제보할 위치 · 아직 공개되지 않음',zIndex:10002});
    el('roadPickConfirm').disabled=false;el('roadPickHint').textContent='핀 위치가 맞으면 ‘이 위치 사용’을 눌러주세요.';return true;
  }
  function cancelAndReturn(){cancelPick();if(returnToReport){returnToReport=false;openReport();}}
  for(const [key,id] of Object.entries({traffic:'roadTraffic',flood:'roadFlood',construction:'roadConstruction'})){
    el(id).checked=pref[key];el(id).onchange=()=>{pref[key]=el(id).checked;save();sync();};
  }
  el('roadReportPick').onclick=startPick;el('roadPickCancel').onclick=cancelAndReturn;
  el('roadPickConfirm').onclick=()=>{
    if(!picked)return;reportPoint={...picked};el('roadReportLocation').textContent=`선택한 위치: ${reportPoint.lat.toFixed(5)}, ${reportPoint.lng.toFixed(5)}`;clearDraft();cancelAndReturn();
  };
  el('roadReportForm').addEventListener('input',clearDraft);
  el('roadReportForm').onsubmit=async event=>{
    event.preventDefault();const status=el('roadDraftStatus');status.classList.remove('isError');
    const fail=text=>{clearDraft();status.classList.add('isError');status.textContent=text;};
    if(!reportPoint){fail('지도에서 제보할 도로 위치를 먼저 선택해주세요.');return;}
    const kind=el('roadReportKind').value,observed=Date.parse(el('roadReportTime').value+':00+07:00'),source=el('roadReportSource').value.trim();
    if(!Number.isFinite(observed)||observed>Date.now()+300000||Date.now()-observed>D.TTL[kind]){fail(kind==='flood'?'최근 6시간 안에 확인한 시각을 입력해주세요.':'최근 7일 안에 확인한 시각을 입력해주세요.');return;}
    if(source&&!D.sourceUrl(source)){fail('관련 링크는 https://로 시작하는 주소를 입력해주세요.');return;}
    const name=el('roadReportName').value.trim(),body=el('roadReportBody').value.trim();
    if(!name||body.length<10){fail('도로 이름과 10자 이상의 현장 상황을 입력해주세요.');return;}
    const text=`[베트남맵 ${LABEL[kind]} 제보]\n지역: ${CITY_DATA[el('roadReportCity').value]?.label||''}\n도로·교차로: ${name}\n확인 시각: ${date(observed)} (베트남 시간)\n위치: https://www.google.com/maps/search/?api=1&query=${reportPoint.lat.toFixed(6)},${reportPoint.lng.toFixed(6)}\n현장 상황: ${body}${source?'\n관련 출처: '+source:''}\n\n현장 사진이 있으면 첨부해주세요. 운영자 확인 전 제보입니다.`;
    el('roadDraftText').value=text;el('roadDraftResult').hidden=false;
    try{await navigator.clipboard.writeText(text);status.textContent='복사했습니다. 카페 글에 붙여넣어 게시해주세요. 아직 전송되지 않았습니다.';}
    catch{status.textContent='아래 내용을 길게 누르거나 선택해 복사한 뒤 카페에 게시해주세요. 아직 전송되지 않았습니다.';el('roadDraftText').focus();el('roadDraftText').select();}
  };
  openButton.onclick=()=>open();el('roadReportOpen').onclick=openReport;el('roadRefresh').onclick=()=>refresh(true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&picking){event.preventDefault();cancelAndReturn();}});
  // An unrelated map action ends the picker without stealing its subsequent click.
  document.addEventListener('click',event=>{if(picking&&event.target.closest?.('#nearbyPick,#nearbyStay,#nearbyCurrent,#addBtn,#locBtn')){returnToReport=false;cancelPick();}},true);
  let ticker=setInterval(()=>{if(!document.hidden){sync();if(pref.flood||pref.construction||dialog.open)refresh();}},60000);
  window.addEventListener('pagehide',()=>{cancelPick();controller?.abort();clearInterval(ticker);ticker=null;});
  window.addEventListener('pageshow',()=>{if(!ticker)ticker=setInterval(()=>{if(!document.hidden){sync();refresh();}},60000);sync();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();refresh();}});
  window.RoadConditions={sync,open,refresh,handleMapClick,isPicking:()=>picking,cancelPick};
  sync();refresh();
})();
