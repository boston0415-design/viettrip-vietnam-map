/* Grounded answers are transient UI state, not member or review records. */
(() => {
  'use strict';
  let active=null;
  const PREFS={group:'단체 모임',date:'데이트',atmosphere:'분위기',quiet:'조용함',view:'전망',rooftop:'루프탑'};
  const node=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
  function cancel(){active?.abort();active=null;}
  const modelLabel=model=>({'@cf/openai/gpt-oss-120b':'OpenAI gpt-oss-120b','@cf/openai/gpt-oss-20b':'OpenAI gpt-oss-20b'}[model]||'AI');
  function advice(list,text,model,relatedSearches=[]){
    const box=node('li','','aiAnswer');box.append(node('p',text,'aiAnswerText'));if(model)box.append(node('small',modelLabel(model)+' · 일반 안내','aiAnswerSource'));
    for(const query of relatedSearches.slice(0,3)){
      const button=node('button',query,'aiTravelPlace');button.type='button';button.onclick=()=>{const input=document.getElementById('aiMapQuestion');input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('aiMapForm').requestSubmit();};box.append(button);
    }
    list.append(box);
  }
  function snapshot(entry){
    const rows=[...(entry.memberRows||[]),...(entry.google?.rows||[])];
    return rows.filter(row=>row.room?.kind!=='unknown'&&(!entry.intent.hotelStars||row.insights?.hotelClass?.kind==='confirmed')&&(!entry.intent.visitToday||['open','later'].includes((row.place?entry.hours?.get(row.place.id):row.hours)?.kind)))
      .map(row=>{
        const p=row.place,info=row.insights||{},google=!!info.googleRating||!p;
        const name=p?.name||row.name,terms=entry.intent.terms||[];
        const named=terms.length>0&&terms.every(t=>!!window.AIMapSearch?.menuKeyword(name,t));
        const preferences=[...new Set([...(info.preferenceHits||[]),...(row.preferenceHits||[])])].filter(x=>PREFS[x]);
        return {row,name,address:p?.address||row.address||'',source:google?'google':'member',rating:google?(info.googleRating||row.rating):row.rating,count:google?(info.googleCount||row.ratingCount||0):row.ratingCount||0,menuNamed:named,preferences,price:info.price?.known?info.price.label:'',member:!!p,recommended:!!row.recommended,benefit:!!p?.memberBenefit};
      }).sort((a,b)=>{
        const requested=window.AISearchInsights?.compare(a.row,b.row,entry.intent)||0;
        if(entry.intent.sortBy==='cheap'||['atmosphere','purpose'].includes(entry.intent.sortBy))return requested;
        // Rank the shortlist by evidence, not a one-vote perfect score. This
        // score is internal only and is never shown as a user rating.
        const score=c=>((c.rating||0)*c.count+4*20)/(c.count+20)+(c.menuNamed ? 0.2 : 0);
        return score(b)-score(a);
      }).slice(0,24).map((c,i)=>({...c,id:'c'+i}));
  }
  function reason(c,key,intent){
    switch(key){
      case 'specialty':return c.menuNamed?(intent.service==='florist'?'업소명에서 꽃집 확인':'업소명에서 요청한 메뉴 확인'):'';
      case 'rating':case 'reviews':return c.rating!=null?(c.source==='google'?'Google':'회원')+' 평점 '+Number(c.rating).toFixed(1)+' · 평가 '+c.count.toLocaleString('ko-KR')+'개':'';
      case 'preference':return c.preferences.length?c.preferences.map(p=>PREFS[p]).join('·')+' 관련 안내 확인':'';
      case 'price':return c.price?'Google 참고 가격대 · '+c.price:'';
      case 'recommended':return c.recommended?'회원 또는 등록자 강추 표시 있음':'';
      case 'benefit':return c.benefit?'등록된 회원 혜택 있음':'';
      case 'match':return intent.service==='florist'?'요청한 지역의 꽃집 검색 결과':'요청한 지역·업종·메뉴 조건에 맞는 검색 결과';
      default:return '';
    }
  }
  function paint(box,entry){
    box.replaceChildren();const result=entry.answer;
    if(!result){box.append(node('p','찾은 업소들을 비교해 추천 이유를 정리하고 있어요.'));box.setAttribute('aria-busy','true');return;}
    box.removeAttribute('aria-busy');
    if(result.error){box.append(node('p',result.error));const retry=node('button','추천 설명 다시 보기','aiRetry');retry.type='button';retry.onclick=()=>{entry.answer=null;render(box.parentElement,entry);};box.append(retry);return;}
    const picks=(result.picks||[]).map(p=>({p,c:entry.answerCandidates?.find(c=>c.id===p.id)})).filter(x=>x.c);
    if(!picks.length){box.append(node('strong','조건을 확인한 뒤 추천할게요.'));box.append(node('p',entry.intent.visitToday?'오늘 영업을 확인한 후보가 아직 없어요. 아래 영업시간 안내를 확인해 주세요.':entry.memberRows?.length||entry.google?.rows?.length?'요청한 룸·시설 등의 확인이 더 필요해요. 아래 문의 후보를 확인해 주세요.':'현재 검색 자료에서 모든 조건을 충족하는 업소를 확인하지 못했어요. 지역이나 메뉴를 바꾸어 물어보셔도 좋아요.'));return;}
    box.append(node('strong',result.basis==='search'?'검색 근거로 추린 후보':entry.intent.pickOne?'한 곳을 고르면':'질문에 맞춰 골랐어요','aiAnswerHeading'));
    for(const [i,{p,c}] of picks.entries()){
      const button=node('button',(i===0?'먼저 추천 · ':'함께 비교 · ')+c.name,'aiAnswerPick');button.type='button';
      button.addEventListener('click',()=>{window.AIMapSearch?.close();document.getElementById('aiMapQuestion')?.blur();if(c.row.place)window.PlaceSearch?.openMember(c.row.place.id);else window.PlaceSearch?.openGoogle(c.row);});
      box.append(button);
      const reasons=[...new Set((p.reasons||[]).map(key=>reason(c,key,entry.intent)).filter(Boolean))];box.append(node('p',reasons.join(' / '),'aiAnswerReason'));
    }
    box.append(node('small',result.basis==='search'?'메뉴·평점·후기 등 확인된 검색 정보로 정리한 후보입니다. 인원·날짜별 예약 가능 여부는 업소에 확인해 주세요.':entry.intent.pickOne?'찾은 후보 중 메뉴·평점·후기 수를 비교한 AI 추천입니다. 누구에게나 절대적인 1위라는 뜻은 아니에요.':'현재 검색 자료를 바탕으로 한 AI 추천입니다. 가격·영업·예약 가능 여부는 업소에 확인해 주세요.','aiAnswerSource'));
  }
  function render(list,entry,{pending=false}={}){
    if(!list||!entry||entry.intent.exploratory)return;
    let box=list.querySelector(':scope > .aiAnswer');if(!box){box=node('li','','aiAnswer');list.prepend(box);}
    if(pending){box.replaceChildren(node('p','조건에 맞는 업소를 찾고, 추천 이유까지 정리할게요.'));return;}
    if(entry.answer){paint(box,entry);return;}
    if(active){paint(box,entry);return;}
    entry.answerCandidates=snapshot(entry);
    if(!entry.answerCandidates.length){entry.answer={picks:[],basis:'empty'};paint(box,entry);return;}
    paint(box,entry);const work=new AbortController();active=work;
    const timer=setTimeout(()=>work.abort(),26000);
    const candidates=entry.answerCandidates.map(({row,...publicFacts})=>publicFacts);
    fetch('/api/answer-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:entry.query,sortBy:entry.intent.sortBy,pickOne:entry.intent.pickOne,candidates}),signal:work.signal})
      .then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||'추천 설명을 잠시 만들지 못했어요. 아래 업소 목록은 계속 볼 수 있어요.');if(!Array.isArray(body.picks)||!body.picks.length||body.picks.some(p=>!candidates.some(c=>c.id===p.id)||!Array.isArray(p.reasons)))throw Error('추천 근거를 확인하지 못했어요. 아래 검색 결과를 확인해 주세요.');return body;})
      .then(result=>{if(active!==work||work.signal.aborted)return;entry.answer=result;const current=list.querySelector(':scope > .aiAnswer');if(current?.isConnected)paint(current,entry);})
      .catch(error=>{if(active!==work)return;entry.answer={basis:'search',picks:entry.answerCandidates.slice(0,entry.intent.pickOne?1:3).map(c=>({id:c.id,reasons:[...(c.preferences.length?['preference']:[]),...(c.menuNamed?['specialty']:[]),...(c.rating!=null?['rating']:['match'])].slice(0,3)}))};const current=list.querySelector(':scope > .aiAnswer');if(current?.isConnected)paint(current,entry);})
      .finally(()=>{clearTimeout(timer);if(active===work)active=null;});
  }
  window.AIMapAnswer={render,advice,cancel,snapshot};
})();
