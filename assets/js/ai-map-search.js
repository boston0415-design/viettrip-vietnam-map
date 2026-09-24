(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
  const PREFERENCES={
    date:{label:'데이트',pattern:/데이트|연인|커플|romantic|date night/i},
    atmosphere:{label:'분위기',pattern:/분위기.{0,8}(좋|괜찮|멋|최고)|좋.{0,8}분위기|감성|아늑|분위기 맛집|atmosphere|ambien/i},
    quiet:{label:'조용함',pattern:/조용|차분|quiet|tranquil/i},
    view:{label:'전망',pattern:/야경|전망|리버뷰|스카이라인|river view|skyline|panoram/i},
    rooftop:{label:'루프탑',pattern:/루프탑|rooftop|roof top/i}
  };
  const AREA_ALIASES=[['푸미흥','phu my hung'],['타오디엔','thao dien'],['호안끼엠','hoan kiem'],['미딩','my dinh'],['서호','tay ho'],['부이비엔','bui vien'],['레탄톤','le thanh ton']];
  const termAliases=term=>/왁싱|waxing/i.test(term)?['왁싱','waxing','wax lông']:[term];
  let districtData=[];
  function inRing(point,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if(((yi>point.lat)!==(yj>point.lat))&&(point.lng<(xj-xi)*(point.lat-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  function inGeometry(point,geometry){
    if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))return false;
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
    return polygons.some(rings=>inRing(point,rings[0])&&!rings.slice(1).some(ring=>inRing(point,ring)));
  }
  function districtMatches(place,district,boundaries=districtData){
    if(!district)return true;
    const text=normalize([place.area,place.address].join(' '));
    if(new RegExp('(?:^|[^0-9])'+district+'\\s*군(?:[^0-9]|$)|(?:quan|district|q\\.)\\s*'+district+'(?:[^0-9]|$)','i').test(text))return true;
    // Prefer an explicit district in the address over a conflicting location pin.
    if(/(?:\d+\s*군|(?:quan|district|q\.)\s*\d+)/i.test(text))return false;
    const point=validMapLocation(place);
    if(!point||placeCityKey(place)!=='hcmc')return false;
    const feature=boundaries.find(f=>f.properties.sourceName==='Quan '+district&&f.properties.era==='2020');
    return !!feature&&inGeometry(point,feature.geometry);
  }
  async function prepareDistricts(intent,signal){
    if(!intent.district||intent.city!=='hcmc'||districtData.length)return;
    try{
      const response=await fetch('./assets/data/admin/hcmc.geojson',{signal});
      if(!response.ok)return;
      const data=await response.json();
      if(Array.isArray(data.features))districtData=data.features.filter(f=>f.properties?.era==='2020'&&/^Quan \d+$/.test(f.properties.sourceName)&&['Polygon','MultiPolygon'].includes(f.geometry?.type));
    }catch(error){if(error.name==='AbortError')throw error;}
  }
  function areaMatches(place,area){
    if(!area)return true;
    const key=normalize(area),aliases=AREA_ALIASES.find(group=>group.some(a=>normalize(a)===key))||[area];
    const text=normalize([place.area,place.address,place.name].join(' '));
    return aliases.some(alias=>text.includes(normalize(alias)));
  }
  function quote(source,term){
    const index=normalize(source.text).indexOf(normalize(term));
    const start=Math.max(0,index-20),end=Math.min(source.text.length,Math.max(0,index)+term.length+65);
    return source.label+' · '+(start?'…':'')+source.text.slice(start,end)+(end<source.text.length?'…':'');
  }
  function collectCandidates(intent,data,nearby){
    const reviewMap=new Map();
    for(const r of data.reviews||[]){if(!reviewMap.has(r.placeId))reviewMap.set(r.placeId,[]);reviewMap.get(r.placeId).push(r);}
    const found=[];
    for(const p of data.places||[]){
      if(!CONFIG.categories[p.category]||p.subcategory==='프라이빗룸')continue;
      if(intent.city!=='all'&&placeCityKey(p)!==intent.city)continue;
      const needsWaxing=(intent.terms||[]).some(term=>/왁싱|waxing/i.test(term));
      if(intent.category&&p.category!==intent.category&&!(needsWaxing&&['spa','barber'].includes(p.category)))continue;
      if(intent.subcategory){
        if(intent.category==='bar'&&intent.subcategory==='바'){if(p.subcategory==='클럽')continue;}
        else if((p.category==='restaurant'?normalizedRestaurantSub(p.subcategory):p.subcategory)!==intent.subcategory)continue;
      }
      if(!districtMatches(p,intent.district)||!areaMatches(p,intent.area))continue;
      if(intent.nearby&&(!nearby||!validMapLocation(p)||geoDistanceMeters(nearby,p)>nearby.radius))continue;
      const reviews=reviewMap.get(p.id)||[];
      const memberRecommendations=new Set(reviews.filter(r=>r.recommended).map(r=>r.createdByHash||r.createdBy||r.id)).size;
      const registrantRecommended=!!p.tags?.includes('강추업소');
      const ratingValues=[p.initialRating,...reviews.map(r=>r.rating)].filter(n=>n!=null&&Number.isFinite(Number(n))&&Number(n)>=1&&Number(n)<=5).map(Number);
      const rating=ratingValues.length?ratingValues.reduce((sum,n)=>sum+n,0)/ratingValues.length:null;
      const sources=[{label:'등록 정보',text:[p.name,p.subcategory,(p.tags||[]).join(' '),p.description,p.benefitText].filter(Boolean).join(' · ')},...reviews.filter(r=>r.text).map(r=>({label:'회원 후기',text:String(r.text)}))];
      const evidence=[],missingTerms=[];
      for(const term of intent.terms||[]){
        const source=sources.find(s=>termAliases(term).some(alias=>normalize(s.text).includes(normalize(alias))));
        if(source)evidence.push(quote(source,termAliases(term).find(alias=>normalize(source.text).includes(normalize(alias)))));else missingTerms.push(term);
      }
      // A general massage/barber business is not evidence of a waxing service.
      if(needsWaxing&&missingTerms.some(term=>/왁싱|waxing/i.test(term)))continue;
      const preferenceHits=[];
      for(const key of intent.preferences||[]){
        const pref=PREFERENCES[key];if(!pref)continue;
        const source=sources.find(s=>pref.pattern.test(s.text)&&!/(분위기|데이트|조용).{0,12}(별로|않|없|최악|안 좋)/.test(s.text));
        if(source){preferenceHits.push(key);const word=source.text.match(pref.pattern)?.[0]||pref.label;evidence.push(quote(source,word));}
      }
      found.push({place:p,evidence:[...new Set(evidence)],missingTerms,preferenceHits,memberRecommendations,registrantRecommended,recommended:memberRecommendations>0||registrantRecommended,rating,ratingCount:ratingValues.length,reviewCount:reviews.filter(r=>r.text?.trim()).length});
    }
    return found.sort((a,b)=>b.preferenceHits.length-a.preferenceHits.length||Number(b.recommended)-Number(a.recommended)||b.memberRecommendations-a.memberRecommendations||(b.rating??-1)-(a.rating??-1)||b.ratingCount-a.ratingCount||b.reviewCount-a.reviewCount||String(a.place.name).localeCompare(String(b.place.name),'ko'));
  }
  function findMatches(intent,data,nearby){
    return collectCandidates(intent,data,nearby).filter(row=>!row.missingTerms.length&&(!intent.benefit||row.place.memberBenefit)&&(!intent.recommended||row.recommended));
  }
  function buildResults(intent,data,nearby){
    // Eligibility comes before member/recommendation/benefit ranking. Never
    // replace a requested cuisine, dish or membership condition with alternatives.
    return {rows:findMatches(intent,data,nearby),fallback:false,missing:[]};
  }
  const form=byId('aiMapForm'),input=byId('aiMapQuestion'),panel=byId('aiMapPanel'),send=byId('aiMapSend');
  if(!form)return;
  let controller=null,hoursController=null,googleController=null,revision=0,last=null;
  const clear=byId('aiMapClear');
  const status=byId('aiMapStatus'),list=byId('aiMapResults'),examples=byId('aiMapExamples'),title=byId('aiMapTitle');
  function fitPanel(){
    if(panel.hidden)return;
    const viewport=window.visualViewport;
    const bottom=(viewport?.offsetTop||0)+(viewport?.height||innerHeight);
    panel.style.setProperty('--ai-panel-space',Math.max(80,bottom-panel.getBoundingClientRect().top-12)+'px');
  }
  function show(){panel.hidden=false;input.setAttribute('aria-expanded','true');fitPanel();}
  function syncInput(){send.disabled=!!controller||input.value.trim().length<2;if(clear)clear.hidden=!input.value;}
  function cancel(){revision++;controller?.abort();hoursController?.abort();googleController?.abort();controller=null;hoursController=null;googleController=null;syncInput();form.removeAttribute('aria-busy');}
  function close(){cancel();panel.hidden=true;input.setAttribute('aria-expanded','false');}
  function reset(){list.replaceChildren();examples.hidden=false;status.textContent='예시를 누르면 바로 찾아드려요. 직접 질문해도 좋아요.';title.textContent='이렇게 물어보세요';byId('aiMapNote').textContent='회원 등록 업소를 먼저, Google 지도 업소를 함께 찾아요.';}
  function waitForPlaces(signal){
    if(!state.sharedDbLoading)return Promise.resolve();
    status.textContent='등록 업소를 불러오고 있어요. 준비되면 결과를 바로 보여드릴게요.';
    return new Promise((resolve,reject)=>{
      const started=Date.now();let timer;
      const done=error=>{clearTimeout(timer);signal.removeEventListener('abort',abort);error?reject(error):resolve();};
      const abort=()=>done(new DOMException('Cancelled','AbortError'));
      const poll=()=>{if(signal.aborted)return abort();if(!state.sharedDbLoading)return done();if(Date.now()-started>=12000)return done(Error('업소 정보를 불러오지 못했어요. 연결을 확인하고 다시 질문해 주세요.'));timer=setTimeout(poll,100);};
      signal.addEventListener('abort',abort,{once:true});poll();
    });
  }
  function showHours(button,result){
    const slot=button.querySelector('.aiHours');if(!slot)return;
    slot.className='aiHours aiHours-'+result.kind;
    const label=slot.querySelector('b');label.textContent=result.label+(result.source==='regular'?' · 정기시간 기준':'');
    const times=slot.querySelector('.aiHoursTimes');times.textContent=result.hours;times.hidden=!result.hours;
    const credit=slot.querySelector('.aiHoursSource');
    const checked=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(result.checkedAt));
    credit.textContent=result.source==='unknown'?'영업시간 정보가 없거나 연결하지 못했어요.':'Google Maps · '+checked+' 확인'+(result.source==='regular'?' · 임시 휴무 미확인':'');
    const row=button.parentElement;
    if(row){
      row.querySelector('.aiHoursAttributions')?.remove();
      const sources=document.createElement('div');sources.className='aiHoursAttributions';
      for(const attribution of result.attributions||[]){
        if(typeof attribution==='string')sources.append(googlePhotoAttribution(attribution));
        else if(attribution.provider){const uri=googlePhotoSafeUrl(attribution.providerURI),el=document.createElement(uri?'a':'span');el.textContent=attribution.provider;if(uri){el.href=uri;el.target='_blank';el.rel='noopener noreferrer';}sources.append(el);}
      }
      if(sources.childNodes.length)row.append(sources);
    }
  }
  function checkHours(rows,intent){
    if(!intent.visitToday||!window.AIPlaceHours||!last||hoursController)return;
    const entry=last,token=revision;entry.hours ||= new Map();
    const pending=rows.filter(row=>!entry.hours.has(row.place.id));if(!pending.length)return;
    const work=new AbortController();hoursController=work;
    window.AIPlaceHours.checkAll(pending,{signal:work.signal,onResult:(row,result)=>{
      if(token!==revision||last!==entry||panel.hidden)return;
      entry.hours.set(row.place.id,result);
      const button=[...list.querySelectorAll('.aiResult')].find(node=>node.dataset.placeId===row.place.id);
      if(button)showHours(button,result);
      // Keep each card in place during a touch/scroll instead of rebuilding the
      // list as hours arrive. This preserves direct selection on every row.
    }}).catch(()=>{}).finally(()=>{if(hoursController===work)hoursController=null;});
  }
  function renderGoogle(entry){
    const section=byId('aiGoogleSection');if(!section||last!==entry)return;
    section.replaceChildren();
    const heading=document.createElement('h3');heading.className='aiSourceHeading';heading.textContent='Google 지도에서 더 찾기';section.append(heading);
    const message=document.createElement('p');message.className='aiGoogleStatus';message.setAttribute('role','status');section.append(message);
    if(!entry.google){message.textContent='같은 지역의 평점 높은 업소를 찾고 있어요…';return;}
    if(entry.google.error){
      message.textContent='Google 검색에 연결하지 못했어요. 등록 업소는 계속 볼 수 있어요.';
      const retry=document.createElement('button');retry.type='button';retry.className='aiRetry';retry.textContent='Google 검색 다시 시도';
      retry.addEventListener('click',()=>{entry.google=null;renderGoogle(entry);searchGoogle(entry);});section.append(retry);return;
    }
    const rows=entry.google.rows;
    message.textContent=rows.length?(entry.intent.terms.length?'업소명에 검색어가 있는 곳 우선 · ':'')+'Google 평점 4점 이상 · 평점, 후기 수 순':'이 지역에서 조건에 맞는 Google 평점 4점 이상 업소를 찾지 못했어요.';
    if(rows.length)title.textContent='추천 업소 · '+(entry.memberCount+rows.length)+'곳';
    const results=document.createElement('ul');results.className='aiGoogleResults';results.setAttribute('aria-label','Google 지도 추천 업소');section.append(results);
    for(const row of rows){
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='aiResult aiGoogleResult';button.dataset.googlePlaceId=row.placeId;
      const name=document.createElement('strong');name.textContent=row.name;button.append(name);
      const rating=document.createElement('span');rating.className='aiRating';rating.textContent='Google ★ '+row.rating.toFixed(1)+' · 후기 '+row.ratingCount.toLocaleString('ko-KR')+'개';button.append(rating);
      if(entry.intent.subcategory){const cuisine=document.createElement('span');cuisine.className='aiMeta';cuisine.textContent='Google 업종 확인 · '+entry.intent.subcategory;button.append(cuisine);}
      const address=document.createElement('span');address.textContent=row.address;button.append(address);
      if(entry.intent.terms.length){const info=document.createElement('span');info.className='aiAlternativeNote';info.textContent=entry.intent.terms.join('·')+' 검색 결과 · 메뉴·서비스 제공 여부는 업소에 확인해 주세요.';button.append(info);}
      if(entry.intent.visitToday){const hours=document.createElement('span');hours.className='aiHours';hours.innerHTML='<b></b><span class="aiHoursTimes"></span><span class="aiHoursSource"></span>';button.append(hours);}
      button.addEventListener('click',()=>{close();input.blur();window.PlaceSearch?.openGoogle(row);});li.append(button);results.append(li);
      if(row.hours)showHours(button,row.hours);
      else{
        const credit=document.createElement('div');credit.className='aiHoursAttributions';
        for(const a of row.attributions||[]){const uri=googlePhotoSafeUrl(a.providerURI),el=document.createElement(uri?'a':'span');el.textContent=a.provider||'';if(uri){el.href=uri;el.target='_blank';el.rel='noopener noreferrer';}credit.append(el);}
        if(credit.textContent)li.append(credit);
      }
    }
  }
  function searchGoogle(entry){
    if(!window.AIGoogleSearch||entry.google||googleController)return;
    const token=revision,work=new AbortController();googleController=work;
    window.AIGoogleSearch.search(entry.intent,{signal:work.signal,boundaries:districtData,nearby:state.nearby,places:db().places}).then(rows=>{
      if(token!==revision||last!==entry)return;entry.google={rows};renderGoogle(entry);
    }).catch(error=>{if(error.name!=='AbortError'&&token===revision&&last===entry){entry.google={error:true};renderGoogle(entry);}})
      .finally(()=>{if(googleController===work)googleController=null;});
  }
  function render(intent){
    list.replaceChildren();examples.hidden=true;title.textContent='AI 검색 결과';
    const note=byId('aiMapNote');note.textContent='질문 조건에 맞는 업소만 표시하고, 그 안에서 회원 등록·강추·혜택 정보를 보여드려요. Google 검색은 최대 20곳의 업종·지역·평점을 확인합니다.';
    if(!intent?.relevant){status.textContent='찾고 싶은 업소의 지역, 업종이나 메뉴를 질문해 주세요.';return;}
    const scope=[CITY_DATA[intent.city]?.label||'전체 지역',intent.district?intent.district+'군':'',intent.area,intent.subcategory||CONFIG.categories[intent.category]?.label].filter(Boolean).join(' · ');
    if(intent.nearby&&!state.nearby){status.textContent='먼저 지도 아래 ‘주변 찾기’에서 현재 위치나 숙소를 지정한 뒤 다시 질문해 주세요.';return;}
    if(intent.unsupported?.length){status.textContent='아직 확인할 수 없는 조건이에요: '+intent.unsupported.join(', ')+'. 지역·업종·메뉴로 다시 질문해 주세요.';return;}
    if(state.sharedDbLoading){status.textContent='등록 업소를 불러오는 중이에요. 잠시 후 질문창을 다시 눌러 주세요.';return;}
    const results=buildResults(intent,db(),state.nearby);
    const {rows}=results;
    const memberOnly=intent.benefit||intent.recommended;
    title.textContent='추천 업소 · '+rows.length+'곳';
    status.textContent=scope+(intent.recommended?' · 회원 강추':'')+(intent.benefit?' · 혜택·제휴':'')+(rows.length?'':memberOnly?' — 모든 조건을 충족하는 회원 등록 업소를 찾지 못했어요. 다른 업종이나 혜택 미확인 업소로 대체하지 않습니다.':' — 맞는 회원 등록 업소가 없어 같은 조건으로 Google 지도에서도 찾아볼게요.');
    if(intent.preferences?.length)status.textContent+=' '+intent.preferences.map(key=>PREFERENCES[key]?.label).filter(Boolean).join('·')+' 관련 정보 우선.';
    if(intent.visitToday){status.textContent+=' 오늘 영업시간을 확인합니다.';note.textContent+=' 베트남 현지 날짜 기준이며, 당일 변경은 업소에 확인해 주세요.';}
    if(intent.district&&intent.city==='hcmc'&&districtData.length)note.textContent+=' '+intent.district+'군은 기존 행정구역 기준입니다.';
    if(last)last.memberCount=rows.length;
    if(rows.length){const heading=document.createElement('li');heading.className='aiSourceHeading';heading.textContent='회원 등록 업소 · '+rows.length+'곳';list.append(heading);}
    for(const row of rows){
      const {place,evidence}=row;
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='aiResult aiMemberResult';button.dataset.placeId=place.id;
      const name=document.createElement('strong');name.textContent=place.name;button.append(name);
      const badges=document.createElement('span');badges.className='aiBadges';
      const badge=(text,kind)=>{const el=document.createElement('span');el.className='aiBadge '+kind;el.textContent=text;badges.append(el);};
      badge('회원 등록','aiMemberBadge');
      if(place.memberBenefit)badge('혜택업소','aiBenefit');
      if(row.memberRecommendations)badge('회원 강추 '+row.memberRecommendations+'명','aiRecommended');
      if(row.registrantRecommended)badge('등록자 강추','aiRecommended');
      if(badges.childElementCount)button.append(badges);
      const meta=document.createElement('span');meta.className='aiMeta';meta.textContent=[placeRegionLabel(place),CONFIG.categories[place.category]?.label,place.subcategory].filter(Boolean).join(' · ');button.append(meta);
      if(row.rating!=null){const rating=document.createElement('span');rating.className='aiRating';rating.textContent='★ '+row.rating.toFixed(1)+' · 회원 평가 '+row.ratingCount+'개';button.append(rating);}
      const address=document.createElement('span');address.textContent=place.address||'주소 미등록';button.append(address);
      if(intent.visitToday){const hours=document.createElement('span');hours.className='aiHours';hours.innerHTML='<b>오늘 영업시간 확인 중…</b><span class="aiHoursTimes"></span><span class="aiHoursSource"></span>';button.append(hours);}
      if(place.memberBenefit&&place.benefitText){const benefit=document.createElement('span');benefit.className='aiBenefitCopy';benefit.textContent=place.benefitText;button.append(benefit);}
      for(const text of evidence.slice(0,2)){const proof=document.createElement('span');proof.className='aiEvidence';proof.textContent=text;button.append(proof);}
      const unconfirmed=[intent.recommended&&!row.recommended?'강추 지정 없음':'',intent.benefit&&!place.memberBenefit?'등록된 혜택 없음':'',...row.missingTerms.map(term=>term+' 정보 미확인'),intent.preferences?.length&&!row.preferenceHits.length?'분위기·방문 목적은 직접 확인해 주세요':''].filter(Boolean);
      if(unconfirmed.length){const info=document.createElement('span');info.className='aiAlternativeNote';info.textContent=unconfirmed.join(' · ');button.append(info);}
      button.addEventListener('click',()=>{if(!db().places.some(p=>p.id===place.id)){render(intent);return;}close();input.blur();window.PlaceSearch?.openMember(place.id);});
      li.append(button);list.append(li);
      const result=last?.hours?.get(place.id);if(intent.visitToday&&result)showHours(button,result);
    }
    checkHours(rows,intent);
    if(window.AIGoogleSearch&&last&&!memberOnly){const section=document.createElement('li');section.id='aiGoogleSection';list.append(section);renderGoogle(last);searchGoogle(last);}
  }
  input.addEventListener('focus',()=>{window.PlaceSearch?.dismiss();if(last?.query===input.value.trim()){if(last.intent.visitToday&&Date.now()-last.checkedAt>60000){last.hours.clear();last.google=null;last.checkedAt=Date.now();}render(last.intent);}else reset();show();});
  input.addEventListener('input',()=>{cancel();last=null;reset();show();});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();form.requestSubmit();}if(event.key==='Escape'){event.preventDefault();close();input.blur();}});
  examples.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;cancel();last=null;input.value=button.textContent;syncInput();form.requestSubmit();});
  clear?.addEventListener('click',()=>{input.value='';cancel();last=null;reset();input.focus();show();});
  byId('aiMapClose').addEventListener('click',()=>{input.focus();close();});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.aiMapSearch'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){input.focus();close();}});
  window.addEventListener('resize',fitPanel);window.visualViewport?.addEventListener('resize',fitPanel);
  form.addEventListener('submit',async event=>{
    event.preventDefault();const query=input.value.trim();if(query.length<2||query.length>300||controller)return;
    cancel();const token=revision;controller=new AbortController();const signal=controller.signal;
    send.disabled=true;form.setAttribute('aria-busy','true');examples.hidden=true;list.replaceChildren();title.textContent='AI가 조건을 찾고 있어요';status.textContent='회원 등록 업소와 Google 지도에서 찾아볼게요…';show();input.blur();
    const pending=controller;const timeout=setTimeout(()=>pending.abort(),22000);
    try{
      const response=await fetch('/api/ask-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,city:state.city}),signal});
      const payload=await response.json();
      if(token!==revision)return;
      if(!response.ok)throw Error(payload.error||'AI 검색을 잠시 사용할 수 없어요. 기존 검색창을 이용해 주세요.');
      if(!payload.intent||!Array.isArray(payload.intent.terms)||!Array.isArray(payload.intent.unsupported))throw Error('AI 응답을 확인하지 못했어요. 다시 질문해 주세요.');
      await prepareDistricts(payload.intent,signal);
      await waitForPlaces(signal);
      if(token!==revision)return;
      last={query,intent:payload.intent,hours:new Map(),checkedAt:Date.now()};render(payload.intent);panel.scrollTop=0;fitPanel();
    }catch(error){if(token!==revision)return;title.textContent='다시 질문해 주세요';status.textContent=error.name==='AbortError'?'응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.':error.message;}
    finally{clearTimeout(timeout);if(token===revision){controller=null;syncInput();form.removeAttribute('aria-busy');}}
  });
  syncInput();
  window.AIMapSearch={findMatches,buildResults,districtMatches,areaMatches,inGeometry,close};
})();
