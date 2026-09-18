(()=>{
  'use strict';
  const data=window.VietGuideData;if(!data)return;
  const $=id=>document.getElementById(id),dialog=$('articleDialog');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    plane:'M22 2 9 15m13-13-7 20-6-7-7-6Z',
    bus:'M5 16h14M5 6h14M7 20v2m10-2v2M5 20h14V5a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3Zm3-7h.01M16 13h.01',
    car:'m5 9 2-5h10l2 5M3 10h18v8H3Zm2 8v3m14-3v3M7 14h.01M17 14h.01',
    bed:'M3 18V7m18 11V9H3m0 6h18M7 5h10v4M3 18v3m18-3v3',
    compass:'m16 8-3 5-5 3 3-5Zm6 4a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    percent:'M5 19 19 5M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    chat:'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 1 1 19 0ZM7 10h10M7 14h6',
    pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    search:'M16 16 22 22M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    bookmark:'M5 3h14v19l-7-5-7 5Z',home:'m2 11 10-9 10 9M5 9v13h14V9M9 22v-8h6v8',
    map:'m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Zm7-3v17m6-14v17',
    share:'M12 16V2m-4 4 4-4 4 4M5 10H3v12h18V10h-2',close:'m5 5 14 14M5 19 19 5',arrow:'M4 12h16m-6-6 6 6-6 6',
    passport:'M5 2h14v20H5ZM8 17h8m-1-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    phone:'M6 2h12v20H6Zm4 16h4',money:'M2 5h20v14H2Zm13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 8h.01M19 16h.01',
    boat:'M12 3v13M7 6h10v7M3 15l9-3 9 3-3 6H6Zm0 8 3-1 3 1 3-1 3 1 3-1 3 1',
    food:'M4 2v6a3 3 0 0 0 6 0V2M7 2v20M17 2c-3 4-4 8-1 10h3V2Zm2 10v10',
    help:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01'
  };
  const icon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]||paths.compass}"/></svg>`;
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon)});
  const topics=new Map(data.topics.map(t=>[t.id,t])),articles=new Map(data.articles.map(a=>[a.id,a]));
  const storageKey='viettrip_saved_guides_v1',historyKey='vietguide-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  let saved=new Set(),storageFailed=false,city='hcmc',topic='all',query='',savedOnly=false,current=null,returnFocus=null,closing=false;
  function readSaved(){try{const raw=JSON.parse(localStorage.getItem(storageKey)||'[]');saved=new Set(Array.isArray(raw)?raw.filter(id=>articles.has(id)):[]);storageFailed=false}catch{storageFailed=true}}
  readSaved();
  function notice(message){
    const el=dialog.open?$('articleStatus'):$('guideToast');if(!el)return;
    el.textContent=message;el.hidden=false;clearTimeout(el.hideTimer);el.hideTimer=setTimeout(()=>{el.hidden=true},5500);
  }
  function normalize(v){return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim()}
  function eligible(a){return !a.cities||a.cities.includes(city)}
  function mapUrl(action={}){
    const url=new URL('/',location.origin);url.searchParams.set('from','guide');url.searchParams.set('city',city);
    if(action.category)url.searchParams.set('category',action.category);
    if(action.group)url.searchParams.set('group',action.group);
    if(action.benefit)url.searchParams.set('benefit','1');
    if(action.panel)url.searchParams.set('panel',action.panel);
    return url.pathname+url.search;
  }
  function readState(){const p=new URL(location.href).searchParams;city=Object.hasOwn(data.cities,p.get('city'))?p.get('city'):'hcmc';topic=topics.has(p.get('topic'))?p.get('topic'):'all';query=(p.get('q')||'').slice(0,120);savedOnly=p.get('saved')==='1';$('guideCity').value=city;$('guideSearch').value=query}
  function updateURL(read=null,push=false){
    const url=new URL(location.href);for(const k of ['city','topic','q','saved','read'])url.searchParams.delete(k);
    url.searchParams.set('city',city);if(topic!=='all')url.searchParams.set('topic',topic);if(query)url.searchParams.set('q',query);if(savedOnly)url.searchParams.set('saved','1');if(read)url.searchParams.set('read',read);
    const state={...(history.state||{})};delete state.vietGuide;if(read)state.vietGuide=historyKey;
    history[push?'pushState':'replaceState'](state,'',url.pathname+url.search+url.hash);
  }
  function render(){
    $('cityNote').textContent=city==='hcmc'?'호치민 현장 안내 + 베트남 공통 정보':'베트남 공통 안내 · 장소는 선택한 도시로 연결';
    $('guideCity').value=city;
    document.querySelectorAll('[data-main-map]').forEach(a=>{a.href=mapUrl()});
    $('topicGrid').innerHTML=data.topics.map(t=>`<button class="topicButton" type="button" data-topic="${t.id}" aria-pressed="${!savedOnly&&topic===t.id}"><span class="topicIcon">${icon(t.icon)}</span><strong>${t.name}</strong><small>${t.note}</small></button>`).join('');
    const terms=normalize(query).split(/\s+/).filter(Boolean);
    const matches=data.articles.filter(a=>(savedOnly?saved.has(a.id):eligible(a))&&(topic==='all'||a.topic===topic)&&terms.every(t=>normalize([a.title,a.summary,...a.tags,...a.sections.map(s=>s.title)].join(' ')).includes(t)));
    $('resultsTitle').textContent=savedOnly?'저장한 여행가이드':topic==='all'?'차근차근, 여행가이드':topics.get(topic).name+' 가이드';
    $('resultsEyebrow').textContent=savedOnly?'이 기기에서 다시 꺼내보기':'여행에 필요한 순간마다';
    $('resultSummary').textContent=(query?'“'+query+'” · ':'')+(savedOnly?'모든 지역 · ':data.cities[city]+' · ')+matches.length+'개의 안내';
    $('guideCards').innerHTML=matches.map(a=>`<article class="guideCard"><div class="cardTop"><span class="cardIcon">${icon(a.icon)}</span><button type="button" class="saveButton" data-save="${a.id}" aria-pressed="${saved.has(a.id)}" aria-label="${esc(a.title)} ${saved.has(a.id)?'저장 해제':'저장'}">${icon('bookmark')}</button></div><span class="cardTag">${topics.get(a.topic).name}${a.cities?' · '+a.cities.map(c=>data.cities[c]).join('·'):' · 베트남 공통'}</span><h3 class="cardHeading"><button type="button" class="cardTitle" data-read="${a.id}">${esc(a.title)}</button></h3><p>${esc(a.summary)}</p><div class="cardBottom"><span>${a.sources?.length?'공식 출처 포함':'일상탈출 이용 팁'}</span><button class="cardRead" type="button" data-read="${a.id}" aria-label="${esc(a.title)} 안내 읽기">안내 읽기 ${icon('arrow')}</button></div></article>`).join('');
    $('guideEmpty').hidden=matches.length>0;
    $('emptyTitle').textContent=savedOnly&&!query?'아직 저장한 안내가 없어요.':'조건에 맞는 안내가 없어요.';
    $('emptyText').textContent=savedOnly&&!query?'안내 카드의 책갈피를 눌러 저장해두세요.':'검색어를 바꾸거나 전체 안내를 확인해보세요.';
    $('savedCount').textContent=saved.size;
    for(const id of ['navHome','navBenefits','navSaved'])$(id).removeAttribute('aria-current');
    $(savedOnly?'navSaved':topic==='benefit'?'navBenefits':'navHome').setAttribute('aria-current','page');
    if(current){$('saveArticle').setAttribute('aria-pressed',String(saved.has(current.id)));$('saveArticle').setAttribute('aria-label',saved.has(current.id)?'가이드 저장 해제':'가이드 저장')}
  }
  function showResults(){ $('resultsTitle').focus({preventScroll:true});$('guideResults').scrollIntoView({block:'start'}) }
  function filter(next={},scroll=true){topic=next.topic||'all';query=next.query||'';savedOnly=Boolean(next.savedOnly);$('guideSearch').value=query;updateURL();render();if(scroll)showResults()}
  function toggleSave(id){
    if(!articles.has(id))return;
    if(!storageFailed)readSaved();saved.has(id)?saved.delete(id):saved.add(id);
    try{localStorage.setItem(storageKey,JSON.stringify([...saved]));storageFailed=false}catch{storageFailed=true}
    const focused=document.activeElement?.dataset.save;render();
    if(focused)document.querySelector(`[data-save="${focused}"]`)?.focus({preventScroll:true});
    notice(storageFailed?'저장 공간을 사용할 수 없어 이번 화면에서만 저장됩니다.':saved.has(id)?'저장한 가이드에 담았어요. 아래 ‘저장’에서 다시 보세요.':'저장을 해제했어요.');
  }
  const templates={
    stay:()=>`[숙소 문의]\n지역: ${data.cities[city]}\n체크인 / 체크아웃: \n인원 / 침실 수: \n희망 숙소·위치: \n도착 예정 시간: \n카페 닉네임: \n문의: 총요금·보증금·취소 조건·적용 가능한 회원 혜택을 알려주세요.`,
    pickup:()=>`[공항 픽업·차량 문의]\n지역: ${data.cities[city]}\n도착 날짜 / 항공편: \n도착 시간 / 터미널: \n인원 / 큰 짐 개수: \n목적지 이름 / 전체 주소: \n카페 닉네임: \n문의: 총요금·만나는 장소·지연 시 대기 조건을 알려주세요.`
  };
  function renderArticle(a){
    $('articleTopic').textContent=topics.get(a.topic).name;
    $('articleBody').innerHTML=`<h2 id="articleTitle">${esc(a.title)}</h2><p class="articleSummary">${esc(a.summary)}</p><p class="articleScope">${a.cities?a.cities.map(c=>data.cities[c]).join(' · '):'베트남 공통'} · 지도 연결 지역: ${data.cities[city]}</p><p id="articleStatus" class="articleNotice" role="status" aria-live="polite" hidden></p>${a.sections.map((s,i)=>`<section class="articleSection"><h3><span class="stepNumber">${String(i+1).padStart(2,'0')}</span>${esc(s.title)}</h3><p>${esc(s.body)}</p></section>`).join('')}${a.notice?`<p class="articleNotice">${esc(a.notice)}</p>`:''}${(a.phrases||[]).map((p,i)=>`<div class="phrase"><p>${esc(p.ko)}</p><strong lang="vi">${esc(p.vi)}</strong><button type="button" data-phrase="${i}">문장 복사</button></div>`).join('')}${a.template?`<div class="requestBox"><label for="requestTemplate">문의 내용 채워서 복사하기</label><textarea id="requestTemplate" spellcheck="false">${esc(templates[a.template]())}</textarea><button id="copyRequest" type="button">문의 내용 복사</button><p>내용을 복사한 뒤 카페의 해당 안내·예약 게시판에서 문의하세요. 자동으로 전송되지 않습니다.</p></div>`:''}<div class="articleSources"><h3>${a.sources?.length?'공식 출처 · 확인 2026.09.18':'일상탈출 이용 팁 · 정리 2026.09.18'}</h3>${(a.sources||[]).map(id=>{const s=data.sources[id];return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`}).join('')}<small>운영시간·승차 동선·이용 조건은 달라질 수 있습니다. 이용 전 공식·현장 안내를 다시 확인하세요.</small></div>`;
    $('articleActions').innerHTML=(a.actions||[]).map(x=>`<a href="${esc(mapUrl(x))}">${icon(x.panel==='reviews'?'chat':'map')}${esc(x.label)}</a>`).join('')+(a.links||[]).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a>`).join('')+(a.cafe?`<a href="${data.cafe}" target="_blank" rel="noopener noreferrer">카페 안내·문의 게시판 찾기 ↗</a>`:'');
    $('saveArticle').setAttribute('aria-pressed',String(saved.has(a.id)));$('saveArticle').setAttribute('aria-label',saved.has(a.id)?'가이드 저장 해제':'가이드 저장');
  }
  function openArticle(id,push=true){
    const a=articles.get(id);if(!a)return;
    if(!eligible(a)){city=a.cities[0];render()}
    const wasOpen=dialog.open;if(!wasOpen)returnFocus=document.activeElement;
    current=a;renderArticle(a);closing=false;
    if(push)updateURL(id,!wasOpen);
    if(!wasOpen){dialog.showModal();document.body.style.overflow='hidden'}dialog.scrollTop=0;
  }
  function finishClose(){if(dialog.open)dialog.close();current=null;closing=false;document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else $('resultsTitle').focus({preventScroll:true})}
  function closeArticle(){if(closing||!dialog.open)return;closing=true;if(history.state?.vietGuide===historyKey)history.back();else{updateURL();finishClose()}}
  async function copy(value){
    try{await navigator.clipboard.writeText(value);notice('복사했어요. 필요한 곳에 붙여넣으세요.')}
    catch{let input=$('copyFallback');if(!input){input=document.createElement('textarea');input.id='copyFallback';input.className='copyFallback';input.readOnly=true;input.setAttribute('aria-label','복사할 내용');$('articleBody').append(input)}input.value=value;input.focus();input.select();notice('자동 복사가 지원되지 않습니다. 선택된 내용을 복사해주세요.')}
  }
  $('guideCity').innerHTML=Object.entries(data.cities).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
  readState();render();
  $('guideCity').addEventListener('change',()=>{city=$('guideCity').value;updateURL();render()});
  $('guideSearch').addEventListener('input',()=>{query=$('guideSearch').value.slice(0,120);updateURL();render()});
  $('guideSearchForm').addEventListener('submit',event=>{event.preventDefault();showResults()});
  $('topicGrid').addEventListener('click',event=>{const b=event.target.closest('[data-topic]');if(b)filter({topic:topic===b.dataset.topic?'all':b.dataset.topic})});
  document.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>filter({query:b.dataset.quick})));
  $('guideCards').addEventListener('click',event=>{const s=event.target.closest('[data-save]'),r=event.target.closest('[data-read]');if(s)toggleSave(s.dataset.save);else if(r)openArticle(r.dataset.read)});
  $('resetGuides').addEventListener('click',()=>filter());$('emptyReset').addEventListener('click',()=>filter());
  $('navHome').addEventListener('click',()=>{filter({},false);window.scrollTo({top:0,behavior:'smooth'})});
  $('navBenefits').addEventListener('click',()=>filter({topic:'benefit'}));$('navSaved').addEventListener('click',()=>filter({savedOnly:true}));
  $('startAirportGuide').addEventListener('click',()=>openArticle(city==='hcmc'?'airport-arrival':'airport-options'));
  $('closeArticle').addEventListener('click',closeArticle);dialog.addEventListener('cancel',event=>{event.preventDefault();closeArticle()});
  $('saveArticle').addEventListener('click',()=>{if(current)toggleSave(current.id)});
  $('shareArticle').addEventListener('click',()=>copy(location.href));
  $('articleBody').addEventListener('click',event=>{const b=event.target.closest('[data-phrase]');if(b&&current?.phrases)copy(current.phrases[Number(b.dataset.phrase)].vi);if(event.target.id==='copyRequest')copy($('requestTemplate').value)});
  window.addEventListener('popstate',()=>{readState();render();const id=new URL(location.href).searchParams.get('read');if(articles.has(id))openArticle(id,false);else finishClose()});
  window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){readSaved();render()}});
  const initial=new URL(location.href).searchParams.get('read');
  if(articles.has(initial)){updateURL();openArticle(initial)}
})();
