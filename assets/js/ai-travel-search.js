/* Reviewed routes and curated guidance; no generated timetables, fares or bookings. */
(() => {
  'use strict';
  const cities={hcmc:['호치민','Ho Chi Minh City'],hanoi:['하노이','Ha Noi'],danang:['다낭','Da Nang'],nhatrang:['나트랑','Nha Trang'],phuquoc:['푸꾸옥','Phu Quoc'],dalat:['달랏','Da Lat'],hoian:['호이안','Hoi An'],vungtau:['붕따우','Vung Tau'],muine:['무이네','Mui Ne']};
  const airports={hcmc:['떤선녓 공항 · SGN','Tan Son Nhat International Airport'],hanoi:['노이바이 공항 · HAN','Noi Bai International Airport'],danang:['다낭 공항 · DAD','Da Nang International Airport'],nhatrang:['깜라인 공항 · CXR','Cam Ranh International Airport'],phuquoc:['푸꾸옥 공항 · PQC','Phu Quoc International Airport'],dalat:['리엔크엉 공항 · DLI','Lien Khuong Airport']};
  const rail={hcmc:['사이공역','Ga Sai Gon'],hanoi:['하노이역','Ga Ha Noi'],danang:['다낭역','Ga Da Nang'],nhatrang:['나트랑역','Ga Nha Trang']};
  const URLS={air:'https://www.vietnamairlines.com/',dalatAir:'https://www.vietnamairlines.com/en-vn/flights-from-ho-chi-minh-city-to-da-lat',bus:'https://futabus.vn/',train:'https://dsvn.vn/',railTime:'https://giotaugiave.dsvn.vn/',dalat:'https://vietnam.travel/places-to-go/central-vietnam/dalat',ferry:'https://online.phuquocexpress.com/',superdong:'https://superdong.com.vn/'};
  function routeCards(t){
    const {origin:o,destination:d,mode='all'}=t;if(!cities[o]||!cities[d]||o===d)return [];
    const cards=[],pair=[o,d],dalat=pair.includes('dalat'),island=pair.includes('phuquoc');
    const add=(key,card)=>{if(mode==='all'||mode===key)cards.push({key,...card});};
    const oa=airports[o],da=airports[d],or=rail[o],dr=rail[d];
    const flight={title:'항공편',description:oa&&da?oa[0]+' → '+da[0]+'. 실제 운항일·직항 여부·잔여 좌석은 항공사에서 확인하세요. 양쪽 공항과 시내 사이 이동은 별도입니다.':'선택한 도시의 공항 연결과 인근 공항까지 육로 이동이 필요한지 항공사에서 확인하세요.',links:[['항공편·요금 확인',o==='hcmc'&&d==='dalat'?URLS.dalatAir:URLS.air]],places:[oa,da].filter(Boolean)};
    if(oa&&da||mode==='flight')add('flight',flight);
    add('bus',{title:island?'버스 + 항구 이동':'버스·리무진',description:island?'푸꾸옥은 섬이므로 육로 구간과 배편을 나누어 확인해야 합니다. 항구·배편과 연결되는 버스인지 예약처에 확인하세요.':'출발지 '+cities[o][0]+', 도착지 '+cities[d][0]+' · 날짜를 선택해 노선을 확인하세요. 예약 사무실과 실제 승차장은 다를 수 있고, 차량 등급·픽업 방식은 편마다 다릅니다.',links:[['FUTA 노선·차량·요금 확인',URLS.bus]],places:[[cities[o][0]+' 버스 예약처 찾기','FUTA Phuong Trang '+cities[o][1]],[cities[d][0]+' 버스터미널 찾기','bus station '+cities[d][1]]],candidate:true});
    if(dalat){
      add('train',{title:'기차 · 달랏 직통 없음',description:'달랏역은 남북선과 연결되지 않습니다. 탑짬(Tháp Chàm)·나트랑 등 본선 역까지 기차를 이용한 뒤 달랏까지 차량·버스 환승을 별도로 알아봐야 합니다. 달랏–짜이맛 관광열차는 이 이동 구간을 대신하지 않습니다.',links:[['베트남철도 구간·시간 확인',URLS.train],['달랏 철도 연결 안내 · 관광청',URLS.dalat]],places:[or||dr,['탑짬역 · 환승 후보','Ga Thap Cham'],['나트랑역 · 환승 후보','Ga Nha Trang']].filter(Boolean),candidate:true});
    }else add('train',{title:or&&dr?'기차':'기차 · 연결역 확인 필요',description:or&&dr?or[0]+' → '+dr[0]+'. 운행 날짜와 열차·좌석 종류를 공식 예매처에서 확인하세요.':'출발지와 목적지 모두에 직통 철도 연결이 있다고 확인된 것은 아닙니다. 인근 역까지의 육로 이동과 실제 운행 구간을 철도 예매처에서 확인하세요.',links:[['베트남철도 공식 예매',URLS.train],['역별 운행표',URLS.railTime]],places:[or,dr].filter(Boolean),candidate:!or||!dr});
    if(island)add('ferry',{title:'배편 · 하띠엔·락자 항구 확인',description:'푸꾸옥 연결편은 하띠엔(Hà Tiên)·락자(Rạch Giá) 항구와 섬 사이 배편을 확인하세요. 도시에서 항구까지의 이동은 별도이며 기상에 따라 운항이 바뀔 수 있습니다.',links:[['Phú Quốc Express 공식 예매',URLS.ferry],['Superdong 공식 운항 안내',URLS.superdong]],places:[['하띠엔 항구','Ha Tien ferry terminal'],['락자 항구','Rach Gia ferry terminal']]});
    else if(mode==='ferry')add('ferry',{title:'배편 · 연결 확인 필요',description:'이 두 도시를 잇는 배편을 확인하지 못했습니다. 항공·육로를 함께 비교해 주세요.',links:[],places:[]});
    return cards;
  }
  const element=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
  function link(parent,label,url){const a=element('a',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
  function searchPlace(query){
    window.AIMapSearch?.close();const field=document.getElementById('searchInput');if(!field)return;
    field.value=query+' Vietnam';field.dispatchEvent(new Event('input',{bubbles:true}));window.PlaceSearch?.submit();
  }
  function render(list,intent){
    if(intent.unsupported?.length)return null;
    if(intent.transport){
      const t=intent.transport,cards=routeCards(t);if(!cards.length)return null;
      for(const card of cards){
        const li=element('li','','aiTravelAnswer');li.append(element('h3',card.title),element('p',card.description));
        for(const [label,query] of card.places){const b=element('button',label+' · 지도에서 보기','aiTravelPlace');b.type='button';b.addEventListener('click',()=>searchPlace(query));li.append(b);}
        for(const [label,url] of card.links)link(li,label,url);
        list.append(li);
      }
      return {title:cities[t.origin][0]+' → '+cities[t.destination][0],status:(t.originExplicit?'질문에 지정한 출발지':'선택한 지도 지역을 출발지로 사용 · 실제 위치 아님')+' · 이동 수단별 안내',note:'실시간 시간표·잔여 좌석·최저가를 조회한 결과는 아닙니다. 날짜·인원·승차장을 공식 예매처에서 확인하세요. 지도 버튼은 공항·역·예약처 검색으로 연결됩니다. 안내 확인: 2026-09-24.'};
    }
    const guide=window.VietGuideData?.articles?.find(a=>a.id===intent.guideTopic&&(!a.cities||a.cities.includes(intent.city)));
    if(guide){
      const li=element('li','','aiTravelAnswer');li.append(element('h3',guide.title),element('p',guide.summary));
      // Existing reviewed article, not a new model-written answer. Keep scoped
      // legal/emergency guidance in the linked article and official sources.
      link(li,'여행가이드에서 자세히 보기','./guide/?city='+encodeURIComponent(intent.city)+'&read='+encodeURIComponent(guide.id));
      for(const id of guide.sources||[]){const source=window.VietGuideData.sources[id];if(source)link(li,source.label,source.url);}
      list.append(li);return {title:'여행 안내',status:'질문과 관련된 여행가이드',note:'일반 안내입니다. 질문의 날짜·요금·개인별 조건은 공식 안내에서 확인하세요. 가이드 검토: '+window.VietGuideData.updated};
    }
    return null;
  }
  function fallback(list,query){
    if(!query)return;
    const li=element('li','','aiTravelAnswer');li.append(element('p','질문의 조건을 확인할 정보가 부족해요. 원래 질문을 유지한 채 직접 찾아볼 수 있어요.'));
    link(li,'Google 지도에서 질문 그대로 검색','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query));
    link(li,'여행가이드 보기','./guide/');list.append(li);
  }
  window.AITravelSearch={routeCards,render,fallback,searchPlace};
})();
