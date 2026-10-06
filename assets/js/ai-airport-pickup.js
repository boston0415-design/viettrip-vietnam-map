/* Airport pickup is a guided map action, not a generic model answer. */
(()=>{
 'use strict';
 let active=false,city='',terminal='';
 const airports=[['hcmc','떤선녓 · 호치민',/떤[선션]?녓|탄손누트|탄손낫|tan\s*son\s*nhat|sgn|호치민/i],['hanoi','노이바이 · 하노이',/노이바이|하노이|noi\s*bai|han\b/i],['danang','다낭',/다낭|da\s*nang|dad\b/i]];
 const sources={T1:'https://www.grab.com/vn/huong-dan-don-grabcar-tai-san-bay-tan-son-nhat/',T2:'https://www.grab.com/global/airport-rides/tan-son-nhat-international-airport/',T3:'https://www.grab.com/vn/blog/huong-dan-don-tra-grabcar-tai-ga-quoc-noi-nha-ga-t3-san-bay-tan-son-nhat/'};
 const steps={T1:'도착장에서 D1 승차구역 표지를 따라 이동하세요. 앱에서 선택한 기둥 위치에서 기사와 만나세요.',T2:'국제선 도착장 밖에서 Grab·앱 호출 차량 표지를 따라 지정 주차장 승차구역으로 이동하세요. 출구 앞 일반택시 대기열과 구분하세요.',T3:'도착장에서 지상층으로 내려가 PNA 주차 건물 방향으로 이동하세요. PNA 지상층의 Grab 지정 승차구역에서 탑승하세요.'};
 const el=id=>document.getElementById(id);
 function matches(query){
  const a=airports.find(x=>x[2].test(query));
  const t=query.match(/(?:^|\s)T\s*([123])(?=$|[^0-9a-z])|([123])\s*터미널/i);
  const delivery=/그랩\s*푸드|grab\s*food|배달|배송/i.test(query);
  const airport=/공항|airport|떤[선션]?녓|탄손누트|탄손낫|tan\s*son\s*nhat|\bsgn\b|노이바이|noi\s*bai/i.test(query);
  const ride=/그랩|grab/i.test(query)&&!delivery;
  const shortReply=/^(?:저는?\s*)?(?:떤[선션]?녓(?:\s*공항)?|호치민(?:\s*공항)?|노이바이(?:\s*공항)?|하노이(?:\s*공항)?|다낭(?:\s*공항)?|국제선|국내선|T\s*[123]|[123]\s*터미널)(?:이에요|예요|이야|입니다|이요|요)?[.!?\s]*$/i.test(query);
  if(delivery){active=false;return false;}
  if(ride&&airport){active=true;city=a?.[0]||'';terminal='';}
  else if(!active||!shortReply){active=false;return false;}
  if(a&&city!==a[0]){city=a[0];terminal='';}
  if(t)terminal='T'+(t[1]||t[2]);
  else if(/국제선/.test(query)&&city)terminal='T2';
  else if(/국내선/.test(query))terminal='';
  return true;
 }
 function render(list){
  list.replaceChildren();el('aiMapExamples').hidden=true;el('aiMapTitle').textContent='공항 그랩 승차장';
  el('aiMapStatus').textContent=!city?'어느 공항에 계세요?':!terminal?'도착 터미널을 선택해 주세요.':'선택한 터미널의 승차구역을 확인하세요.';
  el('aiMapNote').textContent='승차구역 핀은 주변 참고 위치입니다. 정확한 기둥·차로는 Grab 앱과 현장 표지를 확인하세요.';
  const card=document.createElement('section');card.className='aiAirportPickup';list.append(card);
  const text=value=>{const p=document.createElement('p');p.textContent=value;card.append(p);};
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;card.append(b);};
  if(!city){for(const [key,label] of airports)button(label,()=>{city=key;terminal='';render(list)});text('다른 공항이라면 공항 이름을 입력해 주세요.');return;}
  text(airports.find(x=>x[0]===city)[1]);
  if(!terminal){for(const t of city==='hcmc'?['T2','T1','T3']:['T2','T1'])button(t+' · '+(t==='T2'?'국제선':'국내선'),()=>{terminal=t;render(list);showMap(true)});return;}
  const point=(EXTRA_DATA[city]?.points||[]).find(p=>p.type==='그랩승차'&&p.name.includes(terminal));
  text(point?.name||'이 터미널의 승차구역은 확인되지 않았습니다. 터미널을 다시 선택해 주세요.');
  if(point){text(city==='hcmc'?steps[terminal]:point.desc);button('승차구역 지도 보기',()=>showMap(true));}
  if(city==='hcmc'&&sources[terminal]){const a=document.createElement('a');a.href=sources[terminal];a.target='_blank';a.rel='noopener noreferrer';a.textContent='Grab 공식 승차 안내 ↗';card.append(a);}
  text('어디로 가시나요? 위 안내를 확인한 뒤 업소·주소 검색에서 목적지를 선택하면 그랩으로 연결할 수 있어요.');
  button('공항·터미널 다시 선택',()=>{city='';terminal='';render(list)});
 }
 function showMap(collapse){
  if(!city||!terminal)return;
  const point=(EXTRA_DATA[city]?.points||[]).find(p=>p.type==='그랩승차'&&p.name.includes(terminal));
  if(!point||!state.map){el('aiMapStatus').textContent='지도를 불러오는 중입니다. 잠시 후 지도 보기 버튼을 눌러 주세요.';return;}
  if(state.city!==city)switchCity(city);
  jumpToPoi(point.name);
  if(collapse)window.ChatDock?.close();
 }
 window.AIAirportPickup={matches,render,showMap,reset(){active=false;city='';terminal='';},get active(){return active}};
})();
