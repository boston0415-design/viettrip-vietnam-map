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
  const MENU_PATTERNS={
    '꽃집':/꽃집|꽃\s*가게|(?:꽃|꽃다발|꽃바구니)\s*(?:판매|배달|주문|예약)|\bflorists?\b|\bflower\s*shops?\b|\b(?:shop|tiem|cua\s*hang)\s+hoa\b|\bhoa\s+tuoi\b/i,
    '라멘':/라멘|라아멘|\bramen\b|ラーメン/i,
    '쌀국수':/쌀국수|\bpho\b/i,
    '햄버거':/햄버거|수제\s*버거|버거|\b(?:hamburger|burger|burgers|smashburger)\b/i,
    '고기·구이':/고기\s*[·/]?\s*구이|고[기깃]집|삼겹살|오겹살|목살|갈비(?!\s*치킨)|숯불|불고기|바[베비]큐|비비큐|\bbbq\b|\bbarbe[cq]ue\b|\bgrilled\s+(?:meat|beef|pork)\b|\bthit\s+nuong\b|\bsuon\s+nuong\b/i,
    '회':/초밥\s*[·/]\s*회|횟집|회집|사시미|생선회|활어회|모[둠듬]회|광어회|연어회|참치회|\bsashimi\b|\braw\s+fish\b|\bgoi\s+ca\b|(?:^|\s)회(?=\s|[·/,]|$|(?:를|가|는|도|로|와|랑|만|가\s*아니라))/i,
    '반미':/반미|banh\s*mi/i,
    '베이커리':/빵집|베이커리|bakery|boulangerie|patisserie|tiem\s*banh/i,
    '오토바이 대여':/(?:오토바이|스쿠터).{0,10}(?:대여|렌트)|(?:motorbike|motorcycle|scooter).{0,15}rent|rent.{0,15}(?:motorbike|motorcycle|scooter)|cho\s*thue\s*xe\s*may/i
  };
  // Registration's combined noodle tag does not establish a specific dish.
  // Keep genuine ramen names/menu notes, regardless of the venue's cuisine.
  const menuText=(text,term)=>term==='라멘'?String(text||'').replace(/국수\s*[·ㆍ•/|]\s*라멘|라멘\s*[·ㆍ•/|]\s*국수/gi,''):String(text||'');
  function menuKeyword(text,term){
    let value=normalize(menuText(text,term));const pattern=MENU_PATTERNS[term];
    if(term==='고기·구이')value=value.replace(/\bbbq\s*chicken\b|비비큐\s*치킨|치킨\s*비비큐/gi,'');
    if(pattern)return value.match(pattern)?.[0]?.trim()||'';
    return (/왁싱|waxing/i.test(term)?['왁싱','waxing','wax long']:[term]).find(alias=>value.includes(normalize(alias))||window.NameSearch?.matches(text,alias))||'';
  }
  function evidenceFor(sources,term){
    for(const original of sources){
      const source={...original,text:menuText(original.text,term)};
      for(const clause of String(source.text||'').split(/[.!?。\n]/)){
        const keyword=menuKeyword(clause,term);if(!keyword)continue;
        if(MENU_PATTERNS[term]&&/없|안\s*팔|팔지\s*않|판매하지|제공하지|먹지\s*못|있는지|있나요|확인\s*필요|문의|예정|옆집|다른\s*식당|\b(?:no|not|without|whether|wish|maybe)\b|khong\s+(?:co|ban)/i.test(normalize(clause)))continue;
        return {evidence:quote(source,keyword),source};
      }
    }
    return null;
  }
  function cuisineEvidence(sources,cuisine){
    const aliases=[cuisine,...(window.AIGoogleSearch?.cuisineWords?.(cuisine)||[]),...({'프랑스':['프렌치'],'이탈리아':['이탈리안'],'한식':['한국'],'일식':['일본'],'중식':['중국']}[cuisine]||[])];
    for(const source of sources){
      for(const clause of String(source.text||'').split(/[.!?。\n]/)){
        const text=normalize(clause);
        const word=aliases.find(alias=>new RegExp(normalize(alias)+'\\s*(?:요리|음식|메뉴|가정식|코스|퀴진|cuisine|food|dishes|menu)').test(text));
        if(!word||/없|팔지\s*않|제공하지|있는지|있나요|예정|다른\s*식당|옆집|\b(?:no|not|without|wish|whether)\b/.test(text))continue;
        return {evidence:quote(source,word),source};
      }
    }
    return null;
  }
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
    if(aliases.some(alias=>text.includes(normalize(alias))))return true;
    // Some Google addresses omit the neighbourhood. Reuse the map's existing
    // neighbourhood radius, never substitute the whole district for Phu My Hung.
    const point=validMapLocation(place),city=placeCityKey(place);
    const zone=typeof EXTRA_DATA!=='undefined'&&EXTRA_DATA[city]?.zones?.find(z=>z.kind==='circle'&&aliases.some(alias=>normalize(z.name).includes(normalize(alias))));
    return !!(point&&zone&&geoDistanceMeters(point,zone.center)<=zone.radius);
  }
  function quote(source,term){
    const index=normalize(source.text).indexOf(normalize(term));
    const start=Math.max(0,index-20),end=Math.min(source.text.length,Math.max(0,index)+term.length+65);
    return source.label+' · '+(start?'…':'')+source.text.slice(start,end)+(end<source.text.length?'…':'');
  }
  const wantsRoom=intent=>intent.category==='restaurant'&&intent.features?.includes('private_room');
  function roomInfo(sources){
    const keyword=/(?:프라이빗\s*|개별\s*|개인\s*|별도\s*|독립\s*|단독\s*|커플\s*|vip\s*)?룸|별실|개인실|개별실|독립실|\bprivate\s+(?:dining\s+)?rooms?\b|\bphong\s+rieng\b/i;
    let positive=null,negative=false;
    for(const source of sources){
      for(const clause of String(source.text||'').split(/[.!?。\n·]/)){
        const text=normalize(clause),match=text.match(keyword);if(!match||/쇼룸|쇼\s+룸/.test(text))continue;
        const absent=/(?:룸|별실|개인실|개별실|독립실)(?:은|이|가|도|을)?\s*(?:(?:따로|별도로?|아예|전혀|더는|더 이상)\s*)?(?:없|불가|운영하지|제공하지|이용.{0,5}불가)|(?:no|not|without|never|doesn['’]?t|don['’]?t)\s+(?:(?:have|offer|any|a|longer|available)\s+)*(?:private\s+(?:dining\s+)?rooms?)|private\s+(?:dining\s+)?rooms?.{0,14}(?:unavailable|closed|not available)|khong\s+(?:co\s+)?phong\s+rieng/i;
        if(absent.test(text)){negative=true;continue;}
        if(/있는지|있나요|있을까|모르|미확인|확인\s*필요|여부|문의|예정|계획|원했|원하|있으면|다른\s*(?:식당|업소)|옆집|맞은편|maybe|\bmay\b|\bmight\b|unsure|whether|plan(?:ned)?|looking for|wish/.test(text))continue;
        positive ||= {source,term:match[0]};
      }
    }
    if(positive&&!negative)return {kind:'confirmed',evidence:quote(positive.source,positive.term),source:positive.source};
    return {kind:negative&&!positive?'unavailable':'unknown',evidence:''};
  }
  function collectCandidates(intent,data,nearby){
    const reviewMap=new Map();
    for(const r of data.reviews||[]){if(!reviewMap.has(r.placeId))reviewMap.set(r.placeId,[]);reviewMap.get(r.placeId).push(r);}
    const found=[];
    for(const p of data.places||[]){
      if(!CONFIG.categories[p.category]||p.subcategory==='프라이빗룸')continue;
      if(intent.city!=='all'&&placeCityKey(p)!==intent.city)continue;
      const needsWaxing=(intent.terms||[]).some(term=>/왁싱|waxing/i.test(term));
      if(intent.productSearch&&!/휴대폰|핸드폰|스마트폰|아이폰|애플|갤럭시|삼성|노트북|컴퓨터|전자|phone|apple|samsung|computer|laptop|electronics/i.test([p.name,p.subcategory,p.description,...(p.tags||[])].join(' ')))continue;
      if(intent.category&&p.category!==intent.category&&!(needsWaxing&&['spa','barber'].includes(p.category))&&!(intent.subcategory==='베이커리'&&['cafe','restaurant','shopping'].includes(p.category)))continue;
      const reviews=reviewMap.get(p.id)||[];
      const sources=[{label:'등록 정보',text:[p.name,p.subcategory,(p.tags||[]).join(' '),p.description,p.benefitText].filter(Boolean).join(' · ')},...reviews.filter(r=>r.text).map(r=>({label:'회원 후기',text:String(r.text)}))];
      let cuisineProof=null;
      if(intent.subcategory){
        if(intent.category==='bar'&&intent.subcategory==='바'){if(p.subcategory==='클럽')continue;}
        else if(intent.subcategory==='베이커리'){if(p.subcategory!=='베이커리'&&!evidenceFor(sources,'베이커리'))continue;}
        else if((p.category==='restaurant'?normalizedRestaurantSub(p.subcategory):p.subcategory)!==intent.subcategory){
          cuisineProof=p.category==='restaurant'&&cuisineEvidence(sources,intent.subcategory);
          if(!cuisineProof)continue;
        }
      }
      if(!districtMatches(p,intent.district)||!areaMatches(p,intent.area))continue;
      if(intent.nearby&&(!nearby||!validMapLocation(p)||geoDistanceMeters(nearby,p)>nearby.radius))continue;
      const memberRecommendations=new Set(reviews.filter(r=>r.recommended).map(r=>r.createdByHash||r.createdBy||r.id)).size;
      const registrantRecommended=!!p.tags?.includes('강추업소');
      const ratingValues=[p.initialRating,...reviews.map(r=>r.rating)].filter(n=>n!=null&&Number.isFinite(Number(n))&&Number(n)>=1&&Number(n)<=5).map(Number);
      const rating=ratingValues.length?ratingValues.reduce((sum,n)=>sum+n,0)/ratingValues.length:null;
      const room=wantsRoom(intent)?roomInfo([{label:'등록 정보',text:[...(p.tags||[]),p.description,p.benefitText].filter(Boolean).join(' · ')},...sources.slice(1)]):null;
      if(room?.kind==='unavailable')continue;
      const insights=window.AISearchInsights?.inspect({},intent,sources);
      if(insights?.hotelClass?.kind==='different')continue;
      const evidence=cuisineProof?[cuisineProof.evidence]:[],missingTerms=[];
      for(const term of intent.terms||[]){
        const proof=evidenceFor(term==='꽃집'?sources.filter(s=>s.label==='등록 정보'):sources,term);
        if(proof)evidence.push(proof.evidence);else missingTerms.push(term);
      }
      // A general massage/barber business is not evidence of a waxing service.
      if(needsWaxing&&missingTerms.some(term=>/왁싱|waxing/i.test(term)))continue;
      const preferenceHits=[];
      for(const key of intent.preferences||[]){
        const pref=PREFERENCES[key];if(!pref)continue;
        const source=sources.find(s=>pref.pattern.test(s.text)&&!/(분위기|데이트|조용).{0,12}(별로|않|없|최악|안 좋)/.test(s.text));
        if(source){preferenceHits.push(key);const word=source.text.match(pref.pattern)?.[0]||pref.label;evidence.push(quote(source,word));}
      }
      found.push({place:p,room,insights,sources,evidence:[...new Set(evidence)],missingTerms,preferenceHits,memberRecommendations,registrantRecommended,recommended:memberRecommendations>0||registrantRecommended,rating,ratingCount:ratingValues.length,reviewCount:reviews.filter(r=>r.text?.trim()).length});
    }
    return found.sort((a,b)=>Number(b.room?.kind==='confirmed')-Number(a.room?.kind==='confirmed')||(window.AISearchInsights?.compare(a,b,intent)||0)||b.preferenceHits.length-a.preferenceHits.length||Number(b.recommended)-Number(a.recommended)||b.memberRecommendations-a.memberRecommendations||(b.rating??-1)-(a.rating??-1)||b.ratingCount-a.ratingCount||b.reviewCount-a.reviewCount||String(a.place.name).localeCompare(String(b.place.name),'ko'));
  }
  function findMatches(intent,data,nearby){
    return collectCandidates(intent,data,nearby).filter(row=>!row.missingTerms.length&&(!intent.benefit||row.place.memberBenefit)&&(!intent.recommended||row.recommended));
  }
  function buildResults(intent,data,nearby){
    // Eligibility comes before member/recommendation/benefit ranking. Never
    // replace a requested cuisine, dish or membership condition with alternatives.
    return {rows:findMatches(intent,data,nearby),fallback:false,missing:[]};
  }
  function appendRoomInfo(button,row){
    if(!row.room)return;
    const label=document.createElement('span');label.className='aiRoomInfo aiRoom-'+row.room.kind;
    label.textContent=row.room.kind==='confirmed'?'룸 안내 있음 · 예약 가능 여부 문의':'룸 여부 문의 필요';button.append(label);
    if(row.room.evidence){const proof=document.createElement('span');proof.className='aiEvidence';proof.textContent=row.room.evidence;button.append(proof);}
  }
  function appendReviewAttribution(li,review){
    if(!review)return;
    const credit=document.createElement('div');credit.className='aiRoomCredit';
    const author=review.authorAttribution||{},photo=googlePhotoSafeUrl(author.photoURI);
    if(photo){const img=document.createElement('img');img.src=photo;img.alt='';img.loading='lazy';credit.append(img);}
    const link=(label,url)=>{const safe=googlePhotoSafeUrl(url),node=document.createElement(safe?'a':'span');node.textContent=label;if(safe){node.href=safe;node.target='_blank';node.rel='noopener noreferrer';}credit.append(node);};
    link(author.displayName,author.uri);if(review.relativePublishTimeDescription)credit.append(' · '+review.relativePublishTimeDescription+' ');
    link('Google Maps 후기 보기 ↗',review.googleMapsURI);li.append(credit);
  }
  function resultTitle(entry){
    const rows=[...(entry.memberRows||[]),...(entry.google?.rows||[])];
    if(entry.intent.productSearch){title.textContent='판매점 문의 후보 · '+rows.length+'곳';return;}
    if(entry.intent.hotelStars){const count=rows.filter(r=>r.insights?.hotelClass?.kind==='confirmed').length;title.textContent=entry.intent.hotelStars+'성급 안내 '+count+'곳 · 성급 문의 '+(rows.length-count)+'곳';return;}
    if(entry.intent.subcategory==='로컬 KTV'){title.textContent='로컬 등록 '+rows.filter(r=>r.place).length+'곳 · 운영 문의 '+rows.filter(r=>!r.place).length+'곳';return;}
    title.textContent=wantsRoom(entry.intent)?'룸 안내 '+rows.filter(r=>r.room?.kind==='confirmed').length+'곳 · 문의 필요 '+rows.filter(r=>r.room?.kind==='unknown').length+'곳':'추천 업소 · '+rows.length+'곳';
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
  function show(){window.MapUX?.beginSearch('ai');panel.hidden=false;input.setAttribute('aria-expanded','true');fitPanel();}
  function syncInput(){send.disabled=!!controller||input.value.trim().length<2;if(clear)clear.hidden=!input.value;}
  function cancel(){revision++;controller?.abort();hoursController?.abort();googleController?.abort();window.AIResultActions?.cancel();window.AIMapAnswer?.cancel();controller=null;hoursController=null;googleController=null;syncInput();form.removeAttribute('aria-busy');}
  function close(){cancel();panel.hidden=true;input.setAttribute('aria-expanded','false');window.MapUX?.endSearch('ai');}
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
      if(entry.google||entry.intent.benefit||entry.intent.recommended){if(entry.answer?.basis==='empty')entry.answer=null;window.AIMapAnswer?.render(list,entry);}
      // Keep each card in place during a touch/scroll instead of rebuilding the
      // list as hours arrive. This preserves direct selection on every row.
    }}).catch(()=>{}).finally(()=>{if(hoursController===work)hoursController=null;});
  }
  function renderGoogle(entry){
    const section=byId('aiGoogleSection');if(!section||last!==entry)return;
    section.replaceChildren();
    const roomSearch=wantsRoom(entry.intent),unknownSection=byId('aiGoogleRoomUnknown');unknownSection?.replaceChildren();
    const heading=document.createElement('h3');heading.className='aiSourceHeading';heading.textContent='Google 지도에서 더 찾기';section.append(heading);
    const message=document.createElement('p');message.className='aiGoogleStatus';message.setAttribute('role','status');section.append(message);
    if(!entry.google){message.textContent='같은 지역의 평점 높은 업소를 찾고 있어요…';return;}
    if(entry.google.error){
      message.textContent='Google 검색에 연결하지 못했어요. 등록 업소는 계속 볼 수 있어요.';
      const retry=document.createElement('button');retry.type='button';retry.className='aiRetry';retry.textContent='Google 검색 다시 시도';
      retry.addEventListener('click',()=>{entry.google=null;entry.answer=null;window.AIMapAnswer?.cancel();render(entry.intent);});section.append(retry);finishRanking(entry);return;
    }
    const rows=entry.google.rows;
    if(!rows.length&&!entry.memberRows?.length)window.AITravelSearch?.fallback(section,entry.intent.requestText||entry.query);
    const confirmed=rows.filter(row=>row.room?.kind==='confirmed'),unknown=rows.filter(row=>row.room?.kind==='unknown');
    message.textContent=roomSearch?(confirmed.length?'룸 안내를 확인한 Google 업소 · '+confirmed.length+'곳':'Google 정보에서 룸 안내를 확인한 업소는 없어요.'):
      rows.length?(entry.intent.terms.length?'업소명에 검색어가 있는 곳 우선 · ':'')+'Google 평점 4점 이상 · 평점, 후기 수 순':'이 지역에서 조건에 맞는 Google 평점 4점 이상 업소를 찾지 못했어요.';
    resultTitle(entry);
    const results=document.createElement('ul');results.className='aiGoogleResults';results.setAttribute('aria-label','Google 지도 추천 업소');section.append(results);
    let unknownResults;
    if(roomSearch&&unknown.length&&unknownSection){
      byId('aiRoomUnknownSection').hidden=false;
      const caption=document.createElement('h3');caption.className='aiSourceHeading';caption.textContent='Google 지도 · 룸 여부 문의 필요';unknownSection.append(caption);
      unknownResults=document.createElement('ul');unknownResults.className='aiGoogleResults';unknownResults.setAttribute('aria-label','룸 여부 문의가 필요한 Google 업소');unknownSection.append(unknownResults);
    }
    for(const row of rows){
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='aiResult aiGoogleResult';button.dataset.googlePlaceId=row.placeId;
      const name=document.createElement('strong');name.textContent=row.name;button.append(name);
      const rating=document.createElement('span');rating.className='aiRating';rating.textContent='Google ★ '+row.rating.toFixed(1)+' · 후기 '+row.ratingCount.toLocaleString('ko-KR')+'개';button.append(rating);
      if(entry.intent.subcategory){const cuisine=document.createElement('span');cuisine.className='aiMeta';cuisine.textContent=entry.intent.subcategory==='로컬 KTV'?'가라오케 · 로컬 운영 여부 미확인':(row.cuisineByMenu?'메뉴 안내 확인 · ':'Google 업종 확인 · ')+entry.intent.subcategory;button.append(cuisine);}
      const address=document.createElement('span');address.textContent=row.address;button.append(address);
      appendRoomInfo(button,row);
      window.AISearchInsights?.append(button,row,entry.intent);
      for(const proof of row.proofs||[]){const label=document.createElement('span');label.className='aiEvidence';label.textContent=proof.evidence;button.append(label);}
      if(entry.intent.productSearch){const info=document.createElement('span');info.className='aiAlternativeNote';info.textContent='판매점 후보 · 요청 모델 취급·재고·판매가 미확인';button.append(info);}
      if(entry.intent.terms.length){const info=document.createElement('span');info.className='aiAlternativeNote';info.textContent=entry.intent.terms.join('·')+' 검색 결과 · 메뉴·서비스 제공 여부는 업소에 확인해 주세요.';button.append(info);}
      if(entry.intent.visitToday){const hours=document.createElement('span');hours.className='aiHours';hours.innerHTML='<b></b><span class="aiHoursTimes"></span><span class="aiHoursSource"></span>';button.append(hours);}
      button.addEventListener('click',()=>{close();input.blur();window.PlaceSearch?.openGoogle(row);});li.append(button);(row.room?.kind==='unknown'&&unknownResults?unknownResults:results).append(li);
      window.AIResultActions?.appendDelivery(li,row,entry.intent);
      for(const review of new Set([row.room?.review,...(row.proofs||[]).map(p=>p.source.review)].filter(Boolean)))appendReviewAttribution(li,review);
      if(row.hours)showHours(button,row.hours);
      else{
        const credit=document.createElement('div');credit.className='aiHoursAttributions';
        for(const a of row.attributions||[]){const uri=googlePhotoSafeUrl(a.providerURI),el=document.createElement(uri?'a':'span');el.textContent=a.provider||'';if(uri){el.href=uri;el.target='_blank';el.rel='noopener noreferrer';}credit.append(el);}
        if(credit.textContent)li.append(credit);
      }
    }
    finishRanking(entry);
  }
  function finishRanking(entry){
    list.classList.remove('aiRankingPending');
    entry.memberRows=(entry.memberRows||[]).filter(row=>{
      if(row.insights?.hotelClass?.kind!=='different')return true;
      [...list.querySelectorAll('.aiMemberResult')].find(b=>b.dataset.placeId===row.place.id)?.parentElement.remove();return false;
    });
    resultTitle(entry);
    for(const row of entry.memberRows||[]){
      const button=[...list.querySelectorAll('.aiMemberResult')].find(b=>b.dataset.placeId===row.place.id);if(!button)continue;
      button.querySelectorAll('.aiPrice,.aiHotelClass,.aiAudienceInfo,.aiBudgetInfo,.aiEnrichedProof,.aiGoogleRank').forEach(n=>n.remove());
      if(row.insights?.preferenceHits?.length)button.querySelectorAll('.aiAlternativeNote').forEach(n=>{if(n.textContent==='분위기·방문 목적은 직접 확인해 주세요')n.remove();});
      if(entry.intent.hotelStars&&row.insights?.hotelClass?.kind!=='confirmed')button.querySelectorAll('.aiBenefit,.aiRecommended,.aiBenefitCopy').forEach(n=>n.remove());
      window.AISearchInsights?.append(button,row,entry.intent);
      for(const proof of row.insights?.proofs||[]){const p=document.createElement('span');p.className='aiEvidence aiEnrichedProof';p.textContent=proof.evidence;button.append(p);if(proof.source.review)appendReviewAttribution(button.parentElement,proof.source.review);}
      for(const a of row.insights?.attributions||[]){const uri=googlePhotoSafeUrl(a.providerURI);if(uri&&a.provider){const link=document.createElement('a');link.className='aiHoursAttributions';link.href=uri;link.target='_blank';link.rel='noopener noreferrer';link.textContent=a.provider;button.parentElement.append(link);}}
    }
    if(!entry.intent.sortBy||wantsRoom(entry.intent))return;
    const section=byId('aiGoogleSection');if(!section)return;
    list.querySelectorAll(':scope > .aiSourceHeading').forEach(n=>n.remove());
    const h=section.querySelector('h3');if(h)h.textContent='조건에 맞는 업소';
    const status=section.querySelector('.aiGoogleStatus');if(status&&!entry.google.error)status.textContent=window.AISearchInsights?.sortLabel(entry.intent)||'';
    let ul=section.querySelector('ul');if(!ul){ul=document.createElement('ul');ul.className='aiGoogleResults';section.append(ul);}
    const rows=[...(entry.memberRows||[]),...(entry.google?.rows||[])].sort((a,b)=>(window.AISearchInsights?.compare(a,b,entry.intent)||0)||Number(!!b.place)-Number(!!a.place));
    for(const row of rows){const button=[...list.querySelectorAll('.aiResult')].find(b=>row.place?b.dataset.placeId===row.place.id:b.dataset.googlePlaceId===row.placeId);if(button)ul.append(button.parentElement);}
    ul.setAttribute('aria-label','질문 조건순 업소');
  }
  function searchGoogle(entry){
    if(!window.AIGoogleSearch||entry.google||googleController)return;
    const token=revision,work=new AbortController();googleController=work;
    Promise.allSettled([window.AIGoogleSearch.search(entry.intent,{signal:work.signal,boundaries:districtData,nearby:state.nearby,places:(entry.memberRows||[]).map(row=>row.place)}),window.AISearchInsights?.enrich(entry.memberRows||[],entry.intent,{signal:work.signal})]).then(([result])=>{
      if(token!==revision||last!==entry||work.signal.aborted)return;
      entry.google=result.status==='fulfilled'?{rows:result.value}:{error:true};
      if(result.status==='fulfilled')for(const row of entry.memberRows||[]){const info=result.value.memberUpdates?.get(row.place.id);if(info)row.insights=window.AISearchInsights?.mergeMember(row,info,entry.intent)||info;}
      entry.insights=new Map((entry.memberRows||[]).map(row=>[row.place.id,row.insights]));
      renderGoogle(entry);window.AIMapAnswer?.render(list,entry);
    }).catch(error=>{if(error.name!=='AbortError'&&token===revision&&last===entry){entry.google={error:true};renderGoogle(entry);window.AIMapAnswer?.render(list,entry);}})
      .finally(()=>{if(googleController===work)googleController=null;});
  }
  function render(intent){
    list.replaceChildren();examples.hidden=true;title.textContent='AI 검색 결과';
    list.classList.remove('aiRankingPending');
    const note=byId('aiMapNote');note.textContent='질문 조건에 맞는 업소만 표시하고, 그 안에서 회원 등록·강추·혜택 정보를 보여드려요. Google 검색은 최대 20곳의 업종·지역·평점을 확인합니다.';
    if(intent?.mode==='advice'){title.textContent='AI 답변';status.textContent='';note.textContent='AI의 일반 안내입니다. 현재 가격·영업·예약 정보는 별도 확인이 필요합니다.';window.AIMapAnswer?.advice(list,intent.answer,intent.answerModel);return;}
    const product=window.AIResultActions?.renderProduct(list,intent||{});if(product){title.textContent=product.title;status.textContent=product.status;note.textContent=product.note;return;}
    const travel=window.AITravelSearch?.render(list,intent||{});if(travel){title.textContent=travel.title;status.textContent=travel.status;note.textContent=travel.note;return;}
    if(intent?.transport||intent?.guideTopic||intent?.travelDestination||intent?.travelHelp){
      title.textContent='이동·여행 정보 확인';status.textContent='질문의 목적지와 조건에 맞는 안내를 아직 확인하지 못했어요.';note.textContent='관련 없는 업소를 대신 표시하지 않습니다.';window.AITravelSearch?.fallback(list,intent.requestText||input.value);return;
    }
    if(!intent?.relevant){note.textContent='확인되지 않은 내용을 답으로 만들지 않고, 원래 질문과 관련된 정보를 더 찾을 수 있게 연결합니다.';status.textContent='질문에 답할 장소·여행 정보를 아직 확인하지 못했어요.';window.AITravelSearch?.fallback(list,intent?.requestText||input.value);return;}
    if(window.AISearchInsights?.renderGuide(list,intent)){title.textContent='이동·예약 안내';status.textContent='출발 항구와 공식 예매처';note.textContent='공식 선사 안내를 바탕으로 작성했습니다. 아래 링크에서 실제 출발일 정보를 확인하세요.';return;}
    const scope=[CITY_DATA[intent.city]?.label||'전체 지역',intent.district?intent.district+'군':'',intent.area,({'florist':'꽃집','motorbike_rental':'오토바이 대여'}[intent.service])||intent.subcategory||CONFIG.categories[intent.category]?.label].filter(Boolean).join(' · ');
    if(intent.nearby&&!state.nearby){status.textContent='먼저 지도 아래 ‘주변 찾기’에서 현재 위치나 숙소를 지정한 뒤 다시 질문해 주세요.';return;}
    if(intent.unsupported?.length){status.textContent='확인이 필요한 조건: '+intent.unsupported.join(', ');window.AITravelSearch?.fallback(list,intent.requestText||input.value);return;}
    if(state.sharedDbLoading){status.textContent='등록 업소를 불러오는 중이에요. 잠시 후 질문창을 다시 눌러 주세요.';return;}
    window.AIResultActions?.deliveryIntro(list,intent);
    if(intent.action==='grabfood')note.textContent='음식 조건에 맞는 업소를 찾습니다. GrabFood 등록·배달 가능 여부는 별도이며, 확인된 주문 링크가 없으면 업소명을 복사해 찾을 수 있습니다.';
    const results=buildResults(intent,db(),state.nearby);
    const {rows}=results;
    if(last?.insights)for(const row of rows)if(last.insights.has(row.place.id))row.insights=last.insights.get(row.place.id);
    const memberOnly=intent.benefit||intent.recommended,roomSearch=wantsRoom(intent);
    if(last){last.memberRows=rows;resultTitle(last);}
    status.textContent=scope+(intent.recommended?' · 회원 강추':'')+(intent.benefit?' · 혜택·제휴':'')+(rows.length?'':memberOnly?' — 모든 조건을 충족하는 회원 등록 업소를 찾지 못했어요. 다른 업종이나 혜택 미확인 업소로 대체하지 않습니다.':' — 맞는 회원 등록 업소가 없어 같은 조건으로 Google 지도에서도 찾아볼게요.');
    if(intent.productSearch){status.textContent=scope+' · 판매점 문의 후보';note.textContent='요청: '+intent.requestText+' — 제품명은 입력한 그대로 사용합니다. 판매점 평점은 제품별 가격·재고의 근거가 아닙니다. 원하는 모델·용량·보증·최종 가격은 매장에 문의해 주세요.';}
    if(intent.service==='florist')note.textContent='꽃집을 선택하면 위치·길찾기와 공개된 전화·웹사이트를 볼 수 있어요. 원하는 꽃·꽃다발 가격·배달 지역과 시간은 꽃집에 문의해 주세요.';
    const preferenceLabels=(intent.preferences||[]).map(key=>PREFERENCES[key]?.label).filter(Boolean);if(preferenceLabels.length)status.textContent+=' '+preferenceLabels.join('·')+' 관련 정보 우선.';
    if(intent.sortBy)status.textContent+=' '+(window.AISearchInsights?.sortLabel(intent)||'');
    if(intent.budget){status.textContent+=' 요청 예산 '+window.AISearchInsights?.formatMoney({amount:intent.budget.amount,currency:intent.budget.currency})+'. 표시 가격은 일행 전체 이용 총액이 아닐 수 있어요.';note.textContent+=' 인원·이용시간·포함 항목에 따라 총액이 달라져 예산 충족 여부는 업소에 확인해야 합니다.';}
    if(intent.showPrice||intent.sortBy==='cheap')note.textContent+=' 가격대는 Google 참고 정보이며, 통화·금액 형식이 다른 가격은 직접 환산하지 않습니다. 미확인 가격은 추정하지 않습니다.';
    if(intent.hotelStars){status.textContent+=' '+intent.hotelStars+'성급 안내가 있는 곳 우선, 성급 미확인 업소는 문의 후보로 표시합니다.';note.textContent+=' 호텔 '+intent.hotelStars+'성급과 이용자 별점은 다른 기준입니다. 성급 미확인 후보는 예약 전 확인하세요.';}
    if(roomSearch){
      status.textContent=scope+(intent.recommended?' · 회원 강추':'')+(intent.benefit?' · 혜택·제휴':'')+' — 룸 안내가 있는 곳을 먼저, 룸 정보가 없는 곳은 아래 문의 후보로 구분했어요.';
      note.textContent='지역·음식 종류는 그대로 적용합니다. ‘룸 여부 문의 필요’는 룸 보유가 확인된 추천이 아닙니다. 룸 안내가 있어도 오늘 예약 가능한지는 업소에 확인해 주세요.';
    }
    if(intent.visitToday){status.textContent+=' 오늘 영업시간을 확인합니다.';note.textContent+=' 베트남 현지 날짜 기준이며, 당일 변경은 업소에 확인해 주세요.';}
    if(intent.district&&intent.city==='hcmc'&&districtData.length)note.textContent+=' '+intent.district+'군은 기존 행정구역 기준입니다.';
    if(last)last.memberCount=rows.length;
    const confirmedMembers=rows.filter(row=>row.room?.kind!=='unknown');
    if(confirmedMembers.length){const heading=document.createElement('li');heading.className='aiSourceHeading';heading.textContent=(roomSearch?'룸 안내 있는 회원 업소':'회원 등록 업소')+' · '+confirmedMembers.length+'곳';list.append(heading);}
    let unknownSection,unknownList;
    if(roomSearch){
      unknownSection=document.createElement('li');unknownSection.id='aiRoomUnknownSection';unknownSection.hidden=!rows.some(row=>row.room?.kind==='unknown');
      const heading=document.createElement('h3');heading.className='aiSourceHeading';heading.textContent='룸 여부 문의가 필요한 업소';unknownSection.append(heading);
      const explanation=document.createElement('p');explanation.className='aiRoomExplanation';explanation.textContent=scope+' 조건은 맞지만 룸 정보가 없어 확인이 필요해요.';unknownSection.append(explanation);
      unknownList=document.createElement('ul');unknownList.className='aiRoomCandidates';unknownSection.append(unknownList);
    }
    for(const row of rows){
      const {place,evidence}=row;
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='aiResult aiMemberResult';button.dataset.placeId=place.id;
      const name=document.createElement('strong');name.textContent=place.name;button.append(name);
      const badges=document.createElement('span');badges.className='aiBadges';
      const badge=(text,kind)=>{const el=document.createElement('span');el.className='aiBadge '+kind;el.textContent=text;badges.append(el);};
      badge('회원 등록','aiMemberBadge');
      const promote=!intent.productSearch&&row.room?.kind!=='unknown'&&(!intent.hotelStars||row.insights?.hotelClass?.kind==='confirmed');
      if(promote&&place.memberBenefit)badge('혜택업소','aiBenefit');
      if(promote&&row.memberRecommendations)badge('회원 강추 '+row.memberRecommendations+'명','aiRecommended');
      if(promote&&row.registrantRecommended)badge('등록자 강추','aiRecommended');
      if(badges.childElementCount)button.append(badges);
      const meta=document.createElement('span');meta.className='aiMeta';meta.textContent=[placeRegionLabel(place),CONFIG.categories[place.category]?.label,place.subcategory].filter(Boolean).join(' · ');button.append(meta);
      if(row.rating!=null){const rating=document.createElement('span');rating.className='aiRating';rating.textContent='★ '+row.rating.toFixed(1)+' · 회원 평가 '+row.ratingCount+'개';button.append(rating);}
      const address=document.createElement('span');address.textContent=place.address||'주소 미등록';button.append(address);
      appendRoomInfo(button,row);
      window.AISearchInsights?.append(button,row,intent);
      if(intent.visitToday){const hours=document.createElement('span');hours.className='aiHours';hours.innerHTML='<b>오늘 영업시간 확인 중…</b><span class="aiHoursTimes"></span><span class="aiHoursSource"></span>';button.append(hours);}
      if(promote&&place.memberBenefit&&place.benefitText){const benefit=document.createElement('span');benefit.className='aiBenefitCopy';benefit.textContent=place.benefitText;button.append(benefit);}
      for(const text of evidence.slice(0,2)){const proof=document.createElement('span');proof.className='aiEvidence';proof.textContent=text;button.append(proof);}
      const unconfirmed=[intent.recommended&&!row.recommended?'강추 지정 없음':'',intent.benefit&&!place.memberBenefit?'등록된 혜택 없음':'',...row.missingTerms.map(term=>term+' 정보 미확인'),intent.preferences?.some(key=>PREFERENCES[key])&&!row.preferenceHits.length?'분위기·방문 목적은 직접 확인해 주세요':''].filter(Boolean);
      if(unconfirmed.length){const info=document.createElement('span');info.className='aiAlternativeNote';info.textContent=unconfirmed.join(' · ');button.append(info);}
      button.addEventListener('click',()=>{if(!db().places.some(p=>p.id===place.id)){render(intent);return;}close();input.blur();window.PlaceSearch?.openMember(place.id);});
      li.append(button);(row.room?.kind==='unknown'&&unknownList?unknownList:list).append(li);
      window.AIResultActions?.appendDelivery(li,row,intent);
      const result=last?.hours?.get(place.id);if(intent.visitToday&&result)showHours(button,result);
    }
    checkHours(rows,intent);
    if(window.AIGoogleSearch&&last&&!memberOnly){const section=document.createElement('li');section.id='aiGoogleSection';list.append(section);if(unknownList){const slot=document.createElement('li');slot.id='aiGoogleRoomUnknown';unknownList.append(slot);}}
    if(unknownSection)list.append(unknownSection);
    if(window.AIGoogleSearch&&last&&!memberOnly){list.classList.toggle('aiRankingPending',!!intent.sortBy&&!last.google);renderGoogle(last);searchGoogle(last);}
    window.AIMapAnswer?.render(list,last,{pending:!!window.AIGoogleSearch&&!memberOnly&&!last?.google});
  }
  input.addEventListener('focus',()=>{window.PlaceSearch?.dismiss();if(last?.query===input.value.trim()){if(last.intent.visitToday&&Date.now()-last.checkedAt>60000){last.hours.clear();last.google=null;last.answer=null;window.AIMapAnswer?.cancel();last.checkedAt=Date.now();}render(last.intent);}else reset();show();});
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
    send.disabled=true;form.setAttribute('aria-busy','true');examples.hidden=true;list.replaceChildren();title.textContent='질문을 이해하고 있어요';status.textContent='필요한 정보와 추천 근거를 확인할게요…';show();input.blur();
    const pending=controller;const timeout=setTimeout(()=>pending.abort(),30000);
    try{
      const response=await fetch('/api/ask-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,city:state.city}),signal});
      const payload=await response.json();
      if(token!==revision)return;
      if(!response.ok){if(payload.failures)console.warn('Map AI providers: '+JSON.stringify(payload.failures));throw Error(payload.error||'AI 검색을 잠시 사용할 수 없어요. 기존 검색창을 이용해 주세요.');}
      if(!payload.intent||!Array.isArray(payload.intent.terms)||!Array.isArray(payload.intent.unsupported))throw Error('AI 응답을 확인하지 못했어요. 다시 질문해 주세요.');
      await prepareDistricts(payload.intent,signal);
      if(payload.intent.mode!=='advice'&&!payload.intent.transport&&!payload.intent.guideTopic&&!payload.intent.productSearch&&!payload.intent.travelDestination&&!payload.intent.travelHelp)await waitForPlaces(signal);
      if(token!==revision)return;
      if(payload.model&&payload.intent.mode==='advice')payload.intent.answerModel=payload.model;
      last={query,intent:payload.intent,hours:new Map(),checkedAt:Date.now()};render(payload.intent);panel.scrollTop=0;fitPanel();
    }catch(error){if(token!==revision)return;window.AITravelSearch?.fallback(list,query);title.textContent='다시 질문해 주세요';status.textContent=error.name==='AbortError'?'응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.':error.message;}
    finally{clearTimeout(timeout);if(token===revision){controller=null;syncInput();form.removeAttribute('aria-busy');}}
  });
  syncInput();
  window.AIMapSearch={findMatches,buildResults,districtMatches,areaMatches,inGeometry,wantsRoom,roomInfo,menuKeyword,evidenceFor,cuisineEvidence,close};
})();
