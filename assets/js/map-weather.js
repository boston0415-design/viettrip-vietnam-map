/* City forecasts only: never request the visitor's precise location. */
(() => {
  'use strict';
  const wrap=document.querySelector('.mapwrap');if(!wrap)return;
  const layer=document.createElement('div');layer.className='weatherLayer';layer.hidden=true;layer.setAttribute('aria-hidden','true');wrap.append(layer);
  const badge=document.createElement('button');badge.type='button';badge.className='mapWeather';badge.hidden=true;
  badge.setAttribute('aria-haspopup','dialog');badge.setAttribute('aria-controls','weatherDialog');badge.innerHTML='<span id="weatherLabel"></span>';
  // Temperature shares the header links, without creating a public statistics row.
  (document.querySelector('.brandLinks')||document.querySelector('.communityStats'))?.append(badge);
  const details=document.createElement('dialog');details.id='weatherDialog';details.className='weatherDialog';details.setAttribute('data-no-sheet-resize','');details.setAttribute('aria-labelledby','weatherTitle');
  details.innerHTML='<div class="weatherDialogHead"><strong id="weatherTitle">날씨</strong><button id="weatherClose" type="button" aria-label="날씨 닫기">×</button></div><p id="weatherSummary"></p><p id="weatherTime"></p><button id="weatherToggle" type="button" aria-pressed="true">효과 끄기</button><small>시간대 예보 · <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation" target="_blank" rel="noopener">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></small>';
  document.body.append(details);
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)'),saveData=navigator.connection?.saveData;
  let enabled=safeStorageGet('viettrip_weather_effect')==='on',city=null,data=null,controller=null,revision=0,nextFetch=0,timer=null,paintKey='';
  const now=()=>Date.now();
  const storageKey=k=>'viettrip_weather_v1_'+k;
  function condition(entry){
    const symbol=entry?.symbol||'';
    return /snow|sleet/.test(symbol)?'snow':/rain/.test(symbol)?'rain':/cloud|fog/.test(symbol)?'cloud':'clear';
  }
  function paint(){
    const entry=data?.hours.find(h=>h.time<=now()&&now()<h.time+3600000);
    const kind=condition(entry),active=!!entry&&enabled&&!document.hidden&&!reduced.matches&&!saveData&&kind!=='clear';
    badge.hidden=!entry||!Number.isFinite(entry.temp);
    const label=document.getElementById('weatherLabel');
    label.textContent=entry&&Number.isFinite(entry.temp)?`${Math.round(entry.temp)}°`:'';
    const summary=entry?`${CITY_DATA[city]?.label||''} ${label.textContent} · ${{snow:'눈',rain:'비',cloud:'흐림',clear:'맑음'}[kind]} 예보`:'';
    const time=entry?`${new Date(entry.time).toLocaleString('ko-KR',{timeZone:'Asia/Ho_Chi_Minh'})} (베트남 시간) 기준입니다. 실제 날씨와 다를 수 있습니다.`:'';
    badge.title=summary;badge.setAttribute('aria-label',summary+' · 날씨 설정');
    document.getElementById('weatherSummary').textContent=summary||'현재 지역의 날씨 정보가 없습니다.';document.getElementById('weatherTime').textContent=time;
    const toggle=document.getElementById('weatherToggle');toggle.textContent=reduced.matches||saveData?'효과 제한됨':enabled?'효과 끄기':'효과 켜기';toggle.disabled=reduced.matches||!!saveData;toggle.setAttribute('aria-pressed',String(enabled&&!toggle.disabled));
    layer.hidden=!active;
    if(!active){layer.replaceChildren();paintKey='';return;}
    const compact=innerWidth<901,box=wrap.getBoundingClientRect(),height=Math.max(1,Math.round(box.height)),width=Math.max(1,Math.round(box.width||innerWidth));
    const key=kind+':'+width+':'+height;if(paintKey===key)return;paintKey=key;layer.dataset.kind=kind;
    const fall=height+(kind==='rain'?80:50);layer.style.setProperty('--fall',fall+'px');
    const count=kind==='cloud'?3:kind==='rain'?Math.max(compact?40:64,Math.min(compact?64:120,Math.round(width/(compact?7:13)))):(compact?8:14);
    const frag=document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const drop=document.createElement('i');
      if(kind==='rain'){
        // Depth changes size and speed together; independent phases avoid marching rows.
        const depth=i%3,jitter=((i*0.754877666)+0.31)%1,phase=((i*0.414213562)+0.17)%1;
        const angle=5+jitter*3,speed=260+depth*125+jitter*65,duration=fall/speed,drift=-Math.tan(angle*Math.PI/180)*fall;
        drop.style.setProperty('--x',(((i*0.618033989)%1)*100).toFixed(3)+'%');
        drop.style.setProperty('--rain-offset',(-drift/2).toFixed(2)+'px');
        drop.style.setProperty('--rain-length',(9+depth*6+jitter*5).toFixed(2)+'px');
        drop.style.setProperty('--rain-width',(.6+depth*.15).toFixed(2)+'px');
        drop.style.setProperty('--rain-opacity',(.25+depth*.13+jitter*.07).toFixed(3));
        drop.style.setProperty('--rain-angle',angle.toFixed(2)+'deg');
        drop.style.setProperty('--duration',duration.toFixed(3)+'s');
        drop.style.setProperty('--delay',(-duration*phase).toFixed(3)+'s');
        drop.style.setProperty('--drift',drift.toFixed(2)+'px');
      }else{
        drop.style.setProperty('--x',((i*61.8)%100)+'%');drop.style.setProperty('--y',(8+i*17)+'%');drop.style.setProperty('--duration',(kind==='cloud'?32+i*9:5+(i%7)*.5)+'s');drop.style.setProperty('--delay',(-i*(kind==='cloud'?11:.31))+'s');drop.style.setProperty('--drift',(i%2?30:-30)+'px');
      }
      frag.append(drop);
    }
    layer.replaceChildren(frag);
  }
  async function sync(){
    const key=state.city;
    if(key!==city){revision++;controller?.abort();city=key;data=null;nextFetch=0;paintKey='';paint();}
    clearTimeout(timer);
    if(document.hidden||!CITY_DATA[key])return;
    timer=setTimeout(sync,60000);
    if(now()<nextFetch){paint();return;}
    let cached;try{cached=JSON.parse(safeStorageGet(storageKey(key))||'null')}catch{}
    if(cached?.expires>now()&&Array.isArray(cached.hours)){data=cached;nextFetch=cached.expires;paint();return;}
    const version=++revision;controller?.abort();controller=new AbortController();const activeController=controller;
    // Coalesce calls during map renders; retry failures at most once in 30 minutes.
    nextFetch=now()+30*60000;
    const {lat,lng}=CITY_DATA[key].center;
    const timeout=setTimeout(()=>activeController.abort(),10000);
    try{
      const response=await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}`,{signal:activeController.signal});
      if(!response.ok)throw Error('Weather unavailable');
      const raw=await response.json();if(version!==revision)return;
      const hours=(raw.properties?.timeseries||[]).filter(x=>x.data?.next_1_hours).map(x=>({time:Date.parse(x.time),temp:x.data.instant?.details?.air_temperature,symbol:x.data.next_1_hours.summary?.symbol_code||''})).filter(x=>Number.isFinite(x.time)&&x.time>now()-3600000).slice(0,12);
      if(!hours.length)throw Error('No current forecast');
      const expires=Math.max(now()+30*60000,Math.min(now()+2*3600000,Date.parse(response.headers.get('Expires'))||0));
      data={hours,expires};nextFetch=expires;safeStorageSet(storageKey(key),JSON.stringify(data));paint();
    }catch{if(version===revision){data=null;paint();}}finally{clearTimeout(timeout);if(controller===activeController)controller=null;}
  }
  badge.onclick=()=>{if(!details.open)details.showModal();};
  document.getElementById('weatherClose').onclick=()=>details.close();
  document.getElementById('weatherToggle').onclick=()=>{enabled=!enabled;safeStorageSet('viettrip_weather_effect',enabled?'on':'off');paint();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){revision++;if(controller){controller.abort();controller=null;nextFetch=0;}clearTimeout(timer);paint();}else sync();});
  window.addEventListener('resize',()=>{paintKey='';paint();});reduced.addEventListener?.('change',paint);
  window.addEventListener('pagehide',()=>{revision++;if(controller){controller.abort();controller=null;nextFetch=0;}clearTimeout(timer);layer.hidden=true;});
  window.addEventListener('pageshow',sync);
  window.MapWeather={sync};sync();
})();
