// Guidance is separate from the map filters; routes open in Google Maps without a new API service.
const TRANSPORT_SOURCES={
  sgn:'https://www.grab.com/vn/blog/driver/car/sanbaytansonnhat/',
  t3:'https://www.grab.com/vn/en/blog/huong-dan-don-tra-grabcar-tai-ga-quoc-noi-nha-ga-t3-san-bay-tan-son-nhat/',
  han:'https://english.vov.vn/en/travel/noi-bai-airport-opens-dedicated-immigration-lanes-reorganizes-pick-up-zones-post1320744.vov',
  hanBus:'https://www.noibaiairport.vn/vi/phuong-tien-van-chuyen-cong-cong-nid1.html',
  dad:'https://www.grab.com/global/airport-rides/da-nang-international-airport/',
  grab:'https://www.grab.com/global/airport-rides/',
  green:'https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay',
  bus152:'https://thaiest.com/vietnam/travel/ho-chi-minh-airport-bus-152',
  bus109:'https://en.sggp.org.vn/bus-no-109-changed-its-route-connecting-to-new-terminal-3-post117254.html'
};
const TRANSPORT_GUIDES={
  hcmc:{airport:'떤선녓공항 · SGN',note:'국제선은 T2, 국내선은 T1 또는 T3입니다. 항공권의 터미널을 먼저 확인하세요. T3는 T1·T2와 떨어져 있습니다.',terminals:[
    {label:'T2 · 국제선 도착',point:'떤선녓 T2 국제선 터미널',steps:'짐을 찾고 도착장으로 나온 뒤, Grab 앱에서 T2 국제선 도착 승차 지점을 선택하세요. 앱의 사진·표지 안내를 따라 지정 주차구역으로 이동합니다. 일반택시는 TAXI 표지가 있는 공식 대기열에서 탑승하세요.',source:'sgn'},
    {label:'T1 · 국내선 도착',point:'떤선녓 T1 국내선 터미널',steps:'Grab 공식 안내의 D1 승차구역을 확인하세요. 도착 출구와 가장 가까운 차로가 반드시 Grab 승차장은 아닙니다. 호출 화면에 표시된 지점과 현장 안내판을 대조하세요.',source:'sgn'},
    {label:'T3 · 국내선 도착',point:'떤선녓 T3 국내선 터미널',steps:'도착장에서 지상층으로 내려가 PNA 주차장 방향 표지를 따라 이동하세요. PNA 주차장 1층(지상층)의 Grab 지정 구역에서 탑승합니다. 아래 공식 사진 안내로 엘리베이터와 이동 방향을 확인할 수 있습니다.',source:'t3'}
  ],public:'T1·T2에서는 152번, T3에서는 109번 승차 안내를 확인하세요. 109번은 T1·T2를 경유하지 않습니다. 도착 터미널과 시내 하차 지점을 먼저 비교하고 현장에서 운행시간·요금·짐 요금을 확인하세요. 시내 전철을 이용할 때는 지도에서 전철 분류를 선택해 역을 찾고, 역의 노선도에서 진행 방향을 확인하세요.'},
  hanoi:{airport:'노이바이공항 · HAN',note:'T1은 국내선, T2는 국제선입니다. 2026년 8월 승차 동선 변경 안내가 있으므로 예전 출구 번호만 보고 차량을 부르지 마세요.',terminals:[
    {label:'T2 · 국제선 도착',point:'노이바이 T2 국제선',steps:'Grab 등 앱 호출 차량은 T2 P1 주차장 지정 구역을 확인하세요. 혼잡 시 P7로 안내될 수 있습니다. 도착장의 승차 표지와 앱이 지정하는 지점으로 이동하고, 일반택시 대기열과 구분하세요.',source:'han'},
    {label:'T1 · 국내선 도착',point:'노이바이 T1 국내선',steps:'앱 호출 차량은 Hall E 인근 P2 지정 승차구역 안내를 확인하세요. 출구 앞에서 임의로 기다리지 말고, 앱에 표시된 최종 승차 지점에서 기사와 만납니다.',source:'han'}
  ],public:'공항 공식 안내에 86번(하노이역 방면), 68번(하동 방면) 등 버스가 안내되어 있습니다. 숙소와 하차 정류장의 거리를 먼저 비교하세요. 현재 운행시간·요금은 아래 공항 안내에서 확인하세요.',publicSource:'hanBus'},
  danang:{airport:'다낭공항 · DAD',note:'T1 국내선과 T2 국제선을 구분하세요. 호이안으로 이동한다면 목적지를 다낭 시내가 아닌 실제 호이안 숙소 주소로 입력하세요.',terminals:[
    {label:'T2 · 국제선 도착',point:'다낭 T2 국제선',steps:'Grab 공항 안내에는 국제선 도착 Lane 1·2가 표시됩니다. 앱에 표시된 승차 지점을 선택하고 현장 Grab 표지를 따라 이동하세요. 일반택시는 TAXI 대기열을 이용하세요.',source:'dad'},
    {label:'T1 · 국내선 도착',point:'다낭 T1 국내선',steps:'도착 후 앱에서 국내선 T1을 선택하세요. 서비스 종류에 따라 승차 지점이 달라질 수 있으므로 앱의 사진과 현장 표지를 확인하고 이동합니다.',source:'dad'}
  ],public:'짐이 많거나 호이안까지 이동한다면 인원·짐 개수에 맞는 차량을 고르세요. 호텔 픽업은 항공편·도착 터미널·대기 장소·총요금과 추가요금을 예약 확인서로 받아두면 편합니다.'},
  nhatrang:{airport:'깜라인공항 · CXR',note:'나트랑 시내와 공항은 떨어져 있습니다. 목적지가 시내 숙소인지 깜라인 리조트인지 주소로 확인하세요.',terminals:[
    {label:'국제선 T2 / 국내선 T1',point:'깜라인 국제공항',steps:'항공권에서 터미널을 확인하고 도착장에서 공식 TAXI 또는 예약 픽업 표지를 찾으세요. 앱 호출은 실제 터미널과 앱 지정 승차 지점을 일치시킵니다. 아래 지도는 공항 위치 확인용입니다.',source:'grab'}
  ],public:'리조트 셔틀이 있다면 운영시간·예약 필요 여부와 내려주는 건물을 숙소에 확인하세요. 공항버스는 목적지와 막차를 현장에서 확인한 뒤 이용하세요.'},
  phuquoc:{airport:'푸꾸옥공항 · PQC',note:'섬의 북부·중부·남부는 서로 떨어져 있습니다. 비슷한 이름의 호텔이 있으므로 예약 내역의 주소를 사용하세요.',terminals:[
    {label:'여객터미널 도착',point:'푸꾸옥 공항 여객터미널',steps:'도착장 밖 TAXI 표지 또는 예약 차량의 만남 장소를 확인하세요. Grab은 앱이 지정하는 승차 지점을 따릅니다. 지도 핀을 차가 서는 차선으로 단정하지 마세요.',source:'grab'}
  ],public:'숙소나 리조트의 공항 셔틀 유무를 먼저 물어보세요. 무료라고 안내받았더라도 예약 여부·시간·짐 허용량·정확한 하차 장소를 확인하세요.'},
  dalat:{airport:'리엔크엉공항 · DLI',note:'달랏 도심과 공항은 떨어져 있습니다. 이용 항공편의 실제 운항 공항과 시간을 확인한 뒤 차량을 예약하세요.',terminals:[
    {label:'공항 도착',point:'리엔크엉 국제공항',steps:'짐을 찾은 뒤 공식 택시 대기열이나 예약한 차량의 만남 장소를 확인하세요. 앱 호출은 공항 이름만 입력하지 말고 앱에서 지정한 픽업 지점을 확인하세요.',source:'grab'}
  ],public:'숙소 픽업 또는 공항 셔틀을 이용한다면 시내 하차 지점에서 숙소까지의 추가 이동을 확인하세요. 귀국일에는 숙소 출발 시각을 항공사 체크인 마감에 맞춰 정하세요.'},
  vungtau:{airport:'붕따우·호짬으로 이동',note:'예약한 항공편의 도착 공항부터 확인하세요. 호치민 공항 도착 후 육로 이동이라면 시외 구간까지 포함한 차량을 예약하는 편이 초보자에게 편리합니다.',terminals:[],public:'차량 예약 때 공항 터미널, 항공편, 숙소 주소, 인원, 짐 개수를 전달하세요. 시외 편도인지 왕복인지, 통행료·대기료가 포함되는지 확인하세요. 배편은 당일 출발 부두·운항 여부·짐 규정을 운항사에 확인하세요.'},
  muine:{airport:'무이네로 이동',note:'실제 항공편의 도착 공항을 먼저 확인하세요. 공항에서 무이네 숙소까지는 별도 시외 이동을 준비해야 합니다.',terminals:[],public:'시외버스·리무진을 예약할 때 공항 픽업인지 도심 사무실 출발인지 확인하세요. 무이네의 정확한 하차 지점과 숙소까지의 거리를 확인하고, 늦게 도착하면 숙소에 픽업 가능 여부를 문의하세요.'}
};
TRANSPORT_GUIDES.hoian={...TRANSPORT_GUIDES.danang,note:'호이안 여행에 다낭공항을 이용한다면 국제선 T2와 국내선 T1을 확인하세요. 목적지에는 호이안 숙소의 정확한 주소를 넣으세요.'};
function transportRouteUrl(destination){
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination);
}
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.getElementById('transportGuideDialog'),select=document.getElementById('transportCity'),body=document.getElementById('transportGuideBody');
  select.innerHTML=Object.entries(CITY_DATA).map(([key,c])=>`<option value="${esc(key)}">${esc(c.label)}</option>`).join('');
  const sourceLink=(key,label='안내 원문 보기')=>`<a href="${esc(TRANSPORT_SOURCES[key])}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  function render(){
    const key=select.value,guide=TRANSPORT_GUIDES[key];if(!guide)return;
    const transportPoints=(EXTRA_DATA[key==='hoian'?'danang':key]?.points||[]).filter(p=>['그린SM승차','버스승차'].includes(p.type));
    const selected=db().places.find(p=>p.id===state.selected);
    const destination=selected&&placeCityKey(selected)===key?selected:null;
    body.innerHTML=`<div class="guideIntro"><strong>${esc(guide.airport)}</strong><p>${esc(guide.note)}</p></div>
    <section class="guideSection"><h3>첫 이동은 이 순서로</h3><ol>
      <li><b>인터넷 연결과 숙소 주소 준비.</b> 예약 내역의 베트남어 업체명·주소를 복사해 두세요.</li>
      <li><b>짐을 찾고 도착 터미널 확인.</b> 짐이 많거나 동행이 있으면 차량 좌석과 적재 공간을 확인하세요.</li>
      <li><b>차를 타는 위치와 목적지를 각각 확인.</b> 앱에서 터미널·픽업 지점을 선택하고 아래 안내를 따라 승차 장소로 이동하세요.</li>
      <li><b>요금과 결제수단 확인 후 호출.</b> 앱에 표시된 예상 요금·공항/통행료 등 추가요금을 확인하세요. 현금인지 카드인지도 확인합니다.</li>
      <li><b>차량번호·차종·기사 확인 후 탑승.</b> 예약한 차와 맞는지 확인하고, 목적지 주소를 한 번 더 보여주세요.</li>
    </ol></section>
    <section class="guideSection"><h3>어디서 타나요?</h3>${guide.terminals.map((t,i)=>`<details ${i===0?'open':''}><summary>${esc(t.label)}</summary><p>${esc(t.steps)}</p><div class="guideActions"><button type="button" data-terminal="${i}">터미널 위치 보기</button>${sourceLink(t.source,t.source==='han'?'VOV 승차 동선 안내':'공식 안내 보기')}</div></details>`).join('')||'<p>도착 공항 안내는 여행 지역에서 호치민 등 실제 도착 지역을 선택하세요.</p>'}
    <p class="guideNote">지도 핀은 터미널·승차구역 주변을 찾는 참고 위치입니다. 실제 차로·출구는 현장 표지와 앱의 최종 픽업 안내를 따르세요. 길을 건널 때는 지정 보행로를 이용하세요.</p></section>
    ${transportPoints.length?`<section class="guideSection"><h3>Green SM · 버스·셔틀 승차 안내</h3>${transportPoints.map((p,i)=>`<details><summary>${esc(p.name)}</summary><p>${esc(p.desc)}</p><div class="guideActions"><button type="button" data-transport-point="${i}">지도에서 위치 보기</button>${p.sourceUrl?`<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.sourceLabel||'안내 원문')} ↗</a>`:''}</div></details>`).join('')}</section>`:''}
    ${destination?`<section class="guideSection"><h3>선택한 업체까지 이동</h3><p><b>${esc(destination.name)}</b><br>${esc(destination.address)}</p><div class="guideActions"><button type="button" id="copyGuideDestination">업체명·주소 복사</button><a href="${esc(transportRouteUrl(destination.address?destination.name+' '+destination.address:destination.lat+','+destination.lng))}" target="_blank" rel="noopener noreferrer">Google 지도 길찾기 ↗</a></div></section>`:''}
    <section class="guideSection"><h3>택시·버스·예약 차량 고르기</h3><details><summary>앱 호출 차량 / 일반택시</summary><p>앱 호출은 앱에 배정된 차량을 이용하세요. 일반택시는 공항 공식 대기열에서 타고, 출발 전에 미터기 또는 정액 총요금과 추가요금을 확인하세요. 앱으로 카드 결제한 운임을 현금으로 다시 내지 않도록 결제 내역을 확인하세요.</p></details><details><summary>버스·셔틀 / 시외 이동</summary><p>${esc(guide.public)}</p>${guide.publicSource?`<div class="guideActions">${sourceLink(guide.publicSource,'공항 버스·택시 안내')}</div>`:''}</details></section>
    <section class="guideSection"><h3>기사에게 보여주세요</h3>
      <div class="guidePhrase"><p>이 주소로 가 주세요.</p><p lang="vi">Làm ơn đưa tôi đến địa chỉ này.</p><div class="guideActions"><button type="button" data-copy-phrase="Làm ơn đưa tôi đến địa chỉ này.">문장 복사</button></div></div>
      <div class="guidePhrase"><p>저는 앱에 표시된 승차 지점에서 기다리고 있어요.</p><p lang="vi">Tôi đang đợi tại điểm đón trên ứng dụng.</p><div class="guideActions"><button type="button" data-copy-phrase="Tôi đang đợi tại điểm đón trên ứng dụng.">문장 복사</button></div></div>
    </section><p class="guideNote">안내 확인: 2026.09.17 · 승차 동선과 운행시간은 달라질 수 있어요. 최신 현장·운영사 안내를 확인하세요.</p><p id="transportActionStatus" class="guideNote" role="status"></p>`;
    body.querySelectorAll('[data-terminal]').forEach(button=>button.addEventListener('click',()=>{
      const terminal=guide.terminals[Number(button.dataset.terminal)];
      const targetCity=key==='hoian'?'danang':key;
      const point=(EXTRA_DATA[targetCity]?.points||[]).find(p=>p.name===terminal.point);
      if(!state.map||!point){document.getElementById('transportActionStatus').textContent='지도 위치를 아직 불러올 수 없습니다. 안내 원문에서 승차 위치를 확인해주세요.';return}
      dialog.close();if(state.city!==targetCity)switchCity(targetCity);
      jumpToPoi(point.name);
    }));
    body.querySelectorAll('[data-transport-point]').forEach(button=>button.addEventListener('click',()=>{
      const point=transportPoints[Number(button.dataset.transportPoint)],targetCity=key==='hoian'?'danang':key;
      if(!state.map||!point)return;
      dialog.close();if(state.city!==targetCity)switchCity(targetCity);jumpToPoi(point.name);
    }));
    async function copy(value,button){try{await navigator.clipboard.writeText(value);button.textContent='복사했어요'}catch{document.getElementById('transportActionStatus').textContent='복사가 지원되지 않습니다. 화면의 문장을 길게 눌러 복사해주세요.'}}
    body.querySelectorAll('[data-copy-phrase]').forEach(b=>b.addEventListener('click',()=>copy(b.dataset.copyPhrase,b)));
    document.getElementById('copyGuideDestination')?.addEventListener('click',event=>copy([destination.name,destination.address].filter(Boolean).join('\n'),event.currentTarget));
  }
  select.addEventListener('change',render);
  document.getElementById('openTransportGuide').addEventListener('click',()=>{select.value=state.city;render();dialog.showModal()});
});
