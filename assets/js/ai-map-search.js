(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
  function districtMatches(place,district){
    if(!district)return true;
    const text=normalize([place.area,place.address].join(' '));
    return new RegExp('(?:^|[^0-9])'+district+'\\s*군(?:[^0-9]|$)|(?:quan|district|q\\.)\\s*'+district+'(?:[^0-9]|$)','i').test(text);
  }
  function findMatches(intent,data,nearby){
    const reviewMap=new Map();
    for(const r of data.reviews||[]){if(!reviewMap.has(r.placeId))reviewMap.set(r.placeId,[]);reviewMap.get(r.placeId).push(r);}
    const found=[];
    for(const p of data.places||[]){
      if(!CONFIG.categories[p.category]||p.subcategory==='프라이빗룸')continue;
      if(intent.city!=='all'&&placeCityKey(p)!==intent.city)continue;
      if(intent.category&&p.category!==intent.category)continue;
      if(intent.subcategory&&p.subcategory!==intent.subcategory)continue;
      if(!districtMatches(p,intent.district))continue;
      if(intent.benefit&&!p.memberBenefit)continue;
      const reviews=reviewMap.get(p.id)||[];
      if(intent.recommended&&!p.tags?.includes('강추업소')&&!reviews.some(r=>r.recommended))continue;
      if(intent.nearby&&(!nearby||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng))||geoDistanceMeters(nearby,p)>nearby.radius))continue;
      const sources=[{label:'등록 정보',text:[p.name,p.area,p.address,p.subcategory,(p.tags||[]).join(' '),p.description,p.benefitText].filter(Boolean).join(' · ')},...reviews.filter(r=>r.text).map(r=>({label:'회원 후기',text:String(r.text)}))];
      const evidence=[];
      for(const term of intent.terms){
        const source=sources.find(s=>normalize(s.text).includes(normalize(term)));
        if(!source)break;
        // An actual quotation is shown, not a claim that a mentioned dish is on the menu.
        const index=normalize(source.text).indexOf(normalize(term));
        const start=Math.max(0,index-24),end=Math.min(source.text.length,index+term.length+64);
        evidence.push(source.label+' · '+(start?'…':'')+source.text.slice(start,end)+(end<source.text.length?'…':''));
      }
      if(evidence.length!==intent.terms.length)continue;
      found.push({place:p,evidence:[...new Set(evidence)]});
    }
    return found.sort((a,b)=>String(a.place.name).localeCompare(String(b.place.name),'ko'));
  }
  const form=byId('aiMapForm'),input=byId('aiMapQuestion'),panel=byId('aiMapPanel'),send=byId('aiMapSend');
  if(!form)return;
  let controller=null,revision=0,last=null;
  const status=byId('aiMapStatus'),list=byId('aiMapResults'),examples=byId('aiMapExamples'),title=byId('aiMapTitle');
  function fitPanel(){
    if(panel.hidden)return;
    const viewport=window.visualViewport;
    const bottom=(viewport?.offsetTop||0)+(viewport?.height||innerHeight);
    panel.style.setProperty('--ai-panel-space',Math.max(80,bottom-panel.getBoundingClientRect().top-12)+'px');
  }
  function show(){panel.hidden=false;input.setAttribute('aria-expanded','true');fitPanel();}
  function cancel(){revision++;controller?.abort();controller=null;send.disabled=input.value.trim().length<2;form.removeAttribute('aria-busy');}
  function close(){cancel();panel.hidden=true;input.setAttribute('aria-expanded','false');}
  function reset(){list.replaceChildren();examples.hidden=false;status.textContent='예시를 누른 뒤 원하는 조건으로 바꿔도 좋아요.';title.textContent='이렇게 물어보세요';}
  function render(intent){
    list.replaceChildren();examples.hidden=true;title.textContent='AI 검색 결과';
    if(!intent?.relevant){status.textContent='찾고 싶은 업소의 지역, 업종이나 메뉴를 질문해 주세요.';return;}
    const scope=[CITY_DATA[intent.city]?.label||'전체 지역',intent.district?intent.district+'군':'',intent.subcategory||CONFIG.categories[intent.category]?.label,intent.benefit?'혜택업소':'',intent.recommended?'강추업소':'',...intent.terms].filter(Boolean).join(' · ');
    if(intent.nearby&&!state.nearby){status.textContent='먼저 지도 아래 ‘주변 찾기’에서 현재 위치나 숙소를 지정한 뒤 다시 질문해 주세요.';return;}
    if(intent.unsupported.length){status.textContent='이 조건은 아직 확인할 수 없어요: '+intent.unsupported.join(', ')+'. 해당 조건을 빼거나 업소명·지역·메뉴로 다시 질문해 주세요.';return;}
    if(state.sharedDbLoading){status.textContent='등록 업소를 불러오는 중이에요. 잠시 후 다시 질문해 주세요.';return;}
    const matches=findMatches(intent,db(),state.nearby);
    status.textContent=scope+' — '+(matches.length?(intent.terms.length?'관련 정보가 있는 ':'')+matches.length+'곳을 찾았어요. 업소를 누르면 상세정보가 열려요.':'등록 정보와 후기에서 조건을 확인하지 못했어요. 실제로 해당 업소나 메뉴가 없다는 뜻은 아니에요.');
    for(const {place,evidence} of matches){
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='aiResult';
      const name=document.createElement('strong');name.textContent=place.name;button.append(name);
      const meta=document.createElement('span');meta.textContent=[placeRegionLabel(place),CONFIG.categories[place.category]?.label,place.subcategory,place.memberBenefit?'회원 혜택':''].filter(Boolean).join(' · ');button.append(meta);
      const address=document.createElement('span');address.textContent=place.address||'주소 미등록';button.append(address);
      for(const text of evidence.slice(0,3)){const note=document.createElement('span');note.className='aiEvidence';note.textContent=text;button.append(note);}
      button.addEventListener('click',()=>{if(!db().places.some(p=>p.id===place.id)){render(intent);return;}close();input.blur();window.PlaceSearch?.openMember(place.id);});
      li.append(button);list.append(li);
    }
  }
  input.addEventListener('focus',()=>{window.PlaceSearch?.dismiss();if(last?.query===input.value.trim())render(last.intent);else reset();show();});
  input.addEventListener('input',()=>{cancel();last=null;reset();show();});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();form.requestSubmit();}if(event.key==='Escape'){event.preventDefault();close();input.blur();}});
  examples.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;cancel();input.value=button.textContent;send.disabled=false;input.focus();input.setSelectionRange(input.value.length,input.value.length);});
  byId('aiMapClose').addEventListener('click',()=>{input.focus();close();});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.aiMapSearch'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){input.focus();close();}});
  window.addEventListener('resize',fitPanel);window.visualViewport?.addEventListener('resize',fitPanel);
  form.addEventListener('submit',async event=>{
    event.preventDefault();const query=input.value.trim();if(query.length<2||query.length>300||controller)return;
    cancel();const token=revision;controller=new AbortController();const signal=controller.signal;
    send.disabled=true;form.setAttribute('aria-busy','true');examples.hidden=true;list.replaceChildren();title.textContent='AI가 조건을 찾고 있어요';status.textContent='등록 업소와 회원 후기에서 찾아볼게요…';show();input.blur();
    const pending=controller;const timeout=setTimeout(()=>pending.abort(),22000);
    try{
      const response=await fetch('/api/ask-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,city:state.city}),signal});
      const payload=await response.json();
      if(token!==revision)return;
      if(!response.ok)throw Error(payload.error||'AI 검색을 잠시 사용할 수 없어요. 기존 검색창을 이용해 주세요.');
      if(!payload.intent||!Array.isArray(payload.intent.terms)||!Array.isArray(payload.intent.unsupported))throw Error('AI 응답을 확인하지 못했어요. 다시 질문해 주세요.');
      last={query,intent:payload.intent};render(payload.intent);fitPanel();
    }catch(error){if(token!==revision)return;title.textContent='다시 질문해 주세요';status.textContent=error.name==='AbortError'?'응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.':error.message;}
    finally{clearTimeout(timeout);if(token===revision){controller=null;send.disabled=input.value.trim().length<2;form.removeAttribute('aria-busy');}}
  });
  window.AIMapSearch={findMatches,districtMatches,close};
})();
