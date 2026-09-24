/* Search-only evidence and ranking. Never persisted to member records. */
(() => {
  'use strict';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').normalize('NFC').toLowerCase();
  const LEVELS={FREE:[0,'무료'],INEXPENSIVE:[1,'저렴'],MODERATE:[2,'중간 가격대'],EXPENSIVE:[3,'높은 가격대'],VERY_EXPENSIVE:[4,'매우 높은 가격대']};
  const PREFS={
    atmosphere:/분위기.{0,12}(좋|괜찮|멋|최고)|감성|아늑|(?:great|good|lovely|beautiful|nice|cozy|elegant|romantic).{0,20}(?:atmosphere|ambien|interior)|(?:atmosphere|ambien).{0,20}(?:great|good|lovely|beautiful|nice)|khong gian.{0,20}(?:dep|am cung)/i,
    quiet:/조용|차분|\bquiet\b|tranquil|yen tinh/i,
    date:/데이트|연인|커플|romantic|date night/i,
    view:/야경|전망|리버뷰|스카이라인|river view|skyline|panoram/i,
    rooftop:/루프탑|rooftop|roof top/i
  };
  function money(value){
    if(!value||!/^([A-Z]{3})$/.test(value.currencyCode||''))return null;
    const units=Number(value.units),nanos=Number(value.nanos||0);
    if(!Number.isFinite(units)||units<0||!Number.isInteger(nanos)||nanos<0||nanos>=1e9)return null;
    return {amount:units+nanos/1e9,currency:value.currencyCode};
  }
  const formatMoney=m=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:m.currency==='VND'||m.currency==='KRW'?0:2}).format(m.amount)+' '+m.currency;
  function price(raw){
    const low=money(raw.priceRange?.startPrice),high=money(raw.priceRange?.endPrice);
    const key=String(raw.priceLevel||'').replace(/^PRICE_LEVEL_/,'').replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase();
    const level=LEVELS[key];
    if(low&&(!high||(high.currency===low.currency&&high.amount>=low.amount)))return {known:true,low:low.amount,high:high?.amount??null,currency:low.currency,level:level?.[0]??null,label:high?(low.currency==='VND'&&low.amount===1?formatMoney(high)+' 이하':formatMoney(low)+'–'+formatMoney(high)):formatMoney(low)+'부터',source:'Google 가격대'};
    if(level)return {known:true,level:level[0],label:level[1],source:'Google 가격 수준'};
    return {known:false,level:null,label:'가격 정보 없음',source:''};
  }
  function preferenceEvidence(sources,intent){
    const hits=[],proofs=[];
    for(const key of intent.preferences||[]){
      const pattern=PREFS[key];if(!pattern)continue;
      for(const source of sources){
        if(source.label==='Google 업소명')continue; // A promotional name is not atmosphere evidence.
        const clause=String(source.text||'').split(/[.!?。\n]/).find(text=>pattern.test(norm(text))&&!/별로|최악|안\s*좋|좋지\s*않|않|없|시끄|noisy|\bnot\b|\bbad\b|\bpoor\b/.test(norm(text)));
        if(!clause)continue;
        hits.push(key);const keyword=norm(clause).match(pattern)?.[0]||'';
        const at=Math.max(0,norm(clause).indexOf(keyword)-20),excerpt=clause.slice(at,at+160);
        proofs.push({evidence:source.label+' · '+(source.label==='Google 업소 설명'?source.text:(at?'…':'')+excerpt+(clause.length>at+160?'…':'')),source});break;
      }
    }
    return {hits,proofs};
  }
  function hotelInfo(sources,stars){
    if(!stars)return null;
    const reports=new Set();let evidence='';
    for(const source of sources.filter(s=>s.label!=='Google 후기'&&s.label!=='회원 후기')){
      const match=String(source.text||'').match(/([1-5])\s*(?:성급|성\s*호텔|[- ]star)/i);
      if(match){reports.add(Number(match[1]));evidence=source.label+' · '+source.text;}
    }
    return {kind:reports.size===1?(reports.has(stars)?'confirmed':'different'):'unknown',stars,evidence};
  }
  function inspect(raw,intent,sources=[]){
    const preferences=preferenceEvidence(sources,intent);
    return {price:price(raw),preferenceHits:preferences.hits,proofs:preferences.proofs,hotelClass:hotelInfo(sources,intent.hotelStars),googleRating:Number(raw.rating)||null,googleCount:Number(raw.userRatingCount)||0};
  }
  function mergeMember(row,info,intent){
    const local=inspect({},intent,row.sources||[]),proofs=[...(local.proofs||[]),...(info.proofs||[])];
    let hotelClass=info.hotelClass;
    if(local.hotelClass?.kind==='confirmed')hotelClass=info.hotelClass?.kind==='different'?{...local.hotelClass,kind:'unknown'}:local.hotelClass;
    return {...info,hotelClass,preferenceHits:[...new Set([...local.preferenceHits,...(info.preferenceHits||[])])],proofs:proofs.filter((p,i)=>proofs.findIndex(other=>other.evidence===p.evidence)===i)};
  }
  function compare(a,b,intent){
    const aa=a.insights||{},bb=b.insights||{};
    const hotel=Number(bb.hotelClass?.kind==='confirmed')-Number(aa.hotelClass?.kind==='confirmed');if(hotel)return hotel;
    if(intent.sortBy==='cheap'){
      const ap=aa.price||{},bp=bb.price||{};
      const known=Number(!!bp.known)-Number(!!ap.known);if(known)return known;
      const amount=p=>!!p.currency&&Number.isFinite(p.low),an=amount(ap),bn=amount(bp);
      if(an!==bn)return Number(bn)-Number(an);
      if(an&&bn){
        if(ap.currency!==bp.currency)return Number(bp.currency==='VND')-Number(ap.currency==='VND')||ap.currency.localeCompare(bp.currency);
        if(ap.low!==bp.low)return ap.low-bp.low;
        const ah=ap.high??Infinity,bh=bp.high??Infinity;if(ah!==bh)return ah-bh;
      }else if(ap.level!=null&&bp.level!=null&&ap.level!==bp.level)return ap.level-bp.level;
    }
    if(intent.sortBy==='atmosphere'){
      const hit=(bb.preferenceHits?.length??b.preferenceHits?.length??0)-(aa.preferenceHits?.length??a.preferenceHits?.length??0);if(hit)return hit;
    }
    const ar=aa.googleRating||a.rating||0,br=bb.googleRating||b.rating||0,ac=aa.googleCount||a.ratingCount||0,bc=bb.googleCount||b.ratingCount||0;
    if(intent.sortBy==='popular'&&ac!==bc)return bc-ac;
    if(intent.sortBy&&ar!==br)return br-ar;
    if(intent.sortBy&&ac!==bc)return bc-ac;
    return 0;
  }
  const sortLabel=intent=>({cheap:'확인된 금액 낮은 순 · 금액 없는 곳은 가격 수준순 · 미확인은 마지막',atmosphere:'요청한 분위기 관련 근거 우선',popular:'후기 수 많은 순 · 유명도 확정은 아님',top_rated:'이용자 평점 높은 순 · 같은 평점은 후기 수 순'}[intent.sortBy]||'');
  function append(button,row,intent){
    const info=row.insights||{},p=info.price;
    if(row.place&&intent.sortBy&&info.googleRating){const line=document.createElement('span');line.className='aiRating aiGoogleRank';line.textContent='Google ★ '+info.googleRating.toFixed(1)+' · 후기 '+info.googleCount.toLocaleString('ko-KR')+'개';button.append(line);}
    if(p?.known||intent.showPrice){const line=document.createElement('span');line.className='aiPrice';line.textContent=p?.known?p.source+' · '+p.label:'가격 정보 미확인 · 업소에 문의';button.append(line);}
    if(intent.budget){const line=document.createElement('span');line.className='aiAlternativeNote aiBudgetInfo';line.textContent='일행 전체 총액·포함 항목 미확인 · 예산에 맞는지 문의 필요';button.append(line);}
    if(info.hotelClass){const line=document.createElement('span');line.className='aiAlternativeNote aiHotelClass';line.textContent=info.hotelClass.kind==='confirmed'?info.hotelClass.stars+'성급 안내 있음 · 예약 전 확인':info.hotelClass.stars+'성급 여부 미확인 · 이용자 별점과 별개';button.append(line);}
    if(intent.subcategory==='로컬 KTV'&&!row.place){const line=document.createElement('span');line.className='aiAlternativeNote aiAudienceInfo';line.textContent='로컬 운영 여부·총 이용금액은 업소에 확인해 주세요.';button.append(line);}
  }
  async function bounded(promise,signal){
    let timer,abort;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),7000);abort=()=>reject(new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();})]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function enrich(rows,intent,{signal}={}){
    // At most eight confirmed IDs, three at a time. No broad place-name guesses,
    // background refreshes, stored Google content or member/review writes.
    if(!intent.sortBy&&!intent.showPrice&&!intent.hotelStars)return;
    const Place=window.google?.maps?.places?.Place;if(!Place)return;
    let cursor=0;const selected=rows.slice(0,8);
    await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{
      while(cursor<selected.length&&!signal?.aborted){
        const row=selected[cursor++],p=row.place;if(!p)continue;
        const id=p.googlePlaceId||(typeof googlePhotoSavedId==='function'&&googlePhotoSavedId(googlePhotoKey(p)));if(!id)continue;
        try{
          const raw=new Place({id,requestedLanguage:'ko',requestedRegion:'vn'});
          const fields=['displayName','formattedAddress','location','rating','userRatingCount','priceRange','priceLevel','attributions'];
          if(intent.sortBy==='atmosphere'||intent.hotelStars)fields.push('editorialSummary','reviews');
          await bounded(raw.fetchFields({fields}),signal);if(signal?.aborted)return;
          if(!googlePhotoBranchMatches(p,{place_id:id,name:raw.displayName,formatted_address:raw.formattedAddress,geometry:{location:raw.location}}))continue;
          const sources=[...(row.sources||[]),{label:'Google 업소 설명',text:raw.editorialSummary||''},...(raw.reviews||[]).filter(r=>r.authorAttribution?.displayName).map(review=>({label:'Google 후기',text:review.text||review.originalText||'',review}))];
          row.insights=inspect(raw,intent,sources);row.insights.attributions=raw.attributions||[];
        }catch(error){if(error.name==='AbortError')return;}
      }
    }));
  }
  function renderGuide(list,intent){
    if(intent.guide!=='hcmc_phuquoc_ferry')return false;
    const li=document.createElement('li');li.className='aiTravelAnswer';
    const h=document.createElement('h3');h.textContent='호치민 → 육로로 항구 이동 → 푸꾸옥';li.append(h);
    const p=document.createElement('p');p.textContent='배로 푸꾸옥에 가려면 하띠엔(Hà Tiên) 또는 락자(Rạch Giá) 출발 배편을 확인하세요. 호치민에서 출발 항구까지 이동하는 버스·차량은 별도로 예약해야 합니다.';li.append(p);
    for(const [label,url] of [['Phú Quốc Express 공식 배편·가격 확인','https://online.phuquocexpress.com/'],['Superdong 공식 배편 확인','https://superdong.com.vn/']]){const a=document.createElement('a');a.textContent=label+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);}
    const note=document.createElement('p');note.className='aiAlternativeNote';note.textContent='출발일·항구·인원을 선택해 운항편과 최종 금액을 확인하세요. 시간표·잔여 좌석·요금은 이 화면에서 실시간 확인한 값이 아닙니다. 안내 확인: 2026-09-24.';li.append(note);list.append(li);return true;
  }
  window.AISearchInsights={money,price,inspect,mergeMember,compare,sortLabel,append,enrich,preferenceEvidence,hotelInfo,renderGuide,formatMoney};
})();
