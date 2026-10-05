/* Read-only Google discovery. Results stay in this search, never in member data. */
(() => {
  'use strict';
  const CITIES={hcmc:'Ho Chi Minh City',hanoi:'Ha Noi',danang:'Da Nang',nhatrang:'Nha Trang',phuquoc:'Phu Quoc',dalat:'Da Lat',hoian:'Hoi An',vungtau:'Vung Tau',muine:'Mui Ne'};
  const CATEGORIES={restaurant:'restaurant',spa:'spa massage',barber:'barber hair salon',stay:'hotel',karaoke:'karaoke',cafe:'cafe',exchange:'currency exchange',shopping:'shopping',market:'market',attraction:'tourist attraction',bar:'bar',golf:'golf course',pharmacy:'pharmacy',public_office:'government office',hospital:'hospital'};
  const CUISINES={
    '한식':['Korean','korean_restaurant'],'일식':['Japanese','japanese_restaurant'],'베트남':['Vietnamese','vietnamese_restaurant'],'중식':['Chinese','chinese_restaurant'],
    '대만':['Taiwanese','taiwanese_restaurant'],'태국':['Thai','thai_restaurant'],'인도':['Indian','indian_restaurant'],'네팔':['Nepalese',''],
    '싱가포르':['Singaporean',''],'말레이시아':['Malaysian','malaysian_restaurant'],'인도네시아':['Indonesian','indonesian_restaurant'],'필리핀':['Filipino','filipino_restaurant'],
    '이탈리아':['Italian','italian_restaurant'],'프랑스':['French','french_restaurant'],'스페인':['Spanish','spanish_restaurant'],'그리스':['Greek','greek_restaurant'],
    '미국':['American','american_restaurant'],'멕시코':['Mexican','mexican_restaurant'],'터키':['Turkish','turkish_restaurant'],'중동':['Middle Eastern','middle_eastern_restaurant'],
    '양식':['Western','western_restaurant'],'퓨전':['Fusion','fusion_restaurant'],'다국적':['International',''],'기타':['Other','']
  };
  const SUBS={...Object.fromEntries(Object.entries(CUISINES).map(([label,[word]])=>[label,word+' restaurant'])),'바':'bar','클럽':'night club'};
  const CATEGORY_TYPES={restaurant:['restaurant'],spa:['spa','massage','massage_spa','beauty_salon','skin_care_clinic','wellness_center'],barber:['barber_shop','hair_salon','hair_care','beauty_salon'],stay:['lodging','hotel','apartment_building','apartment_complex'],karaoke:['karaoke'],cafe:['cafe','coffee_shop','bakery','dessert_shop','juice_shop'],exchange:['currency_exchange','bank','jewelry_store'],shopping:['store','shopping_mall'],market:['market'],attraction:['tourist_attraction','museum','historical_landmark','park','beach'],bar:['bar','pub','wine_bar','cocktail_bar','night_club','bar_and_grill'],golf:['golf_course'],pharmacy:['pharmacy','drugstore'],public_office:['government_office','local_government_office','embassy','post_office','police'],hospital:['hospital','doctor','medical_clinic','medical_center','dentist','veterinary_care']};
  const AREAS={'푸미흥':'Phu My Hung','타오디엔':'Thao Dien','호안끼엠':'Hoan Kiem','미딩':'My Dinh','서호':'Tay Ho','부이비엔':'Bui Vien','레탄톤':'Le Thanh Ton'};
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
  const waxing=term=>/왁싱|wax(?:ing)?|wax long/i.test(normalize(term));
  const cuisineWords=cuisine=>CUISINES[cuisine]?[CUISINES[cuisine][0]]:[];
  const sourcesFor=place=>[{label:'Google 업소명',text:place.displayName||''},{label:'Google 업소 설명',text:place.editorialSummary||''},...(place.reviews||[]).filter(r=>r.authorAttribution?.displayName).flatMap(review=>[...new Set([review.text,review.originalText].filter(Boolean))].map(text=>({label:'Google 후기',text,review})))];
  function includedType(intent){
    if(intent.terms?.includes('꽃집'))return 'florist';
    if(intent.productSearch)return intent.productKind==='computer'?'electronics_store':'cell_phone_store';
    if(intent.subcategory==='베이커리')return 'bakery';
    if(intent.subcategory==='호텔')return 'hotel';
    if(intent.category==='restaurant')return intent.cuisineAsMenu?'restaurant':CUISINES[intent.subcategory]?.[1]||'restaurant';
    if(intent.category==='bar'&&intent.subcategory==='클럽')return 'night_club';
    return '';
  }
  function typeMatches(place,intent){
    const types=place.types||[];
    if(intent.category==='shopping'&&intent.terms?.some(term=>window.AIQueryIntent?.searchItemFor(term)?.shopTypes?.some(type=>types.includes(type))))return true;
    if(intent.terms?.includes('꽃집'))return types.includes('florist');
    if(intent.productSearch)return types.includes(intent.productKind==='computer'?'electronics_store':'cell_phone_store');
    if(intent.subcategory==='베이커리')return types.includes('bakery');
    if(intent.subcategory==='호텔')return types.includes('hotel')||types.includes('lodging');
    if(intent.subcategory==='로컬 KTV'&&/한인|한국식|korean karaoke|일본식|japanese karaoke|중국식|chinese karaoke/i.test([place.displayName,place.editorialSummary].join(' ')))return false;
    if(intent.category==='karaoke')return types.includes('karaoke')||/karaoke|가라오케|\bktv\b|노래방/i.test(place.displayName||'');
    if(intent.category==='restaurant'&&intent.subcategory){
      const cuisine=CUISINES[intent.subcategory];
      if(!cuisine)return false;
      if(cuisine[1]&&types.includes(cuisine[1]))return true;
      if(intent.cuisineAsMenu&&types.includes('restaurant')&&window.AIMapSearch?.cuisineEvidence(sourcesFor(place),intent.subcategory))return true;
      if(cuisine[1])return false;
      // Where Google has no specific cuisine type, require the requested cuisine
      // in the name; a generic "restaurant" result is insufficient evidence.
      return types.includes('restaurant')&&[intent.subcategory,cuisine[0]].some(word=>normalize(place.displayName).includes(normalize(word)));
    }
    if(intent.category==='bar'&&intent.subcategory==='클럽')return types.includes('night_club');
    if(intent.category==='bar'&&intent.subcategory==='바')return types.some(t=>t!=='night_club'&&CATEGORY_TYPES.bar.includes(t));
    return !intent.category||(CATEGORY_TYPES[intent.category]||[]).some(type=>types.includes(type));
  }
  function termProof(place,term,intent={}){
    if(term==='꽃집'&&(place.types||[]).includes('florist'))return {evidence:'Google 업종 · 꽃집',source:{label:'Google 업종'}};
    if(term==='라멘'&&(place.types||[]).includes('ramen_restaurant'))return {evidence:'Google 업종 · 라멘',source:{label:'Google 업종'}};
    if(term==='햄버거'&&(place.types||[]).includes('hamburger_restaurant'))return {evidence:'Google 업종 · 햄버거',source:{label:'Google 업종'}};
    if(term==='고기·구이'&&(place.types||[]).some(type=>['barbecue_restaurant','korean_barbecue_restaurant'].includes(type)))return {evidence:'Google 업종 · 고기·구이',source:{label:'Google 업종'}};
    const proof=window.AIMapSearch.evidenceFor(sourcesFor(place),term);if(proof)return proof;
    const translated=intent.termTranslations?.find(t=>t.term===term);
    if(translated&&!window.AIQueryIntent?.searchItemFor(term)){
      const aliases=[translated.vi,translated.en].filter(Boolean).map(s=>normalize(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'));
      if(aliases.length){const proof=window.AIMapSearch.evidenceFor(sourcesFor(place),term,new RegExp('(?<![a-z])(?:'+aliases.join('|')+')(?![a-z])','i'));if(proof)return proof;}
    }
    // A named cơm tấm shop supplies the rice context for a pork-chop menu
    // mentioned in a review; preserve the original quote and its attribution.
    if(term==='껌승'&&window.AIMapSearch.menuKeyword(place.displayName,'껌땀')&&!/\b(?:vegan|vegetarian|chay)\b|채식/i.test(normalize(place.displayName))){
      return window.AIMapSearch.evidenceFor(sourcesFor(place).filter(s=>s.label!=='Google 업소명'),term,/돼지\s*갈비|\bpork\s*chops?\b|\bsuon\b(?!\s+(?:bo|chay)\b)/i);
    }
    return null;
  }
  function relatedDishProof(place,term){
    const dish=window.AIQueryIntent?.dishFor(term);
    if(!dish?.related||!window.AIMapSearch.menuKeyword(place.displayName,dish.related))return null;
    const text=normalize(sourcesFor(place).map(s=>s.text).join(' '));
    if((place.types||[]).some(t=>['vegan_restaurant','vegetarian_restaurant'].includes(t))||/\b(?:vegan|vegetarian|chay)\b|채식|\b(?:no|without)\s+(?:pork|ribs|com\s+(?:tam\s+)?suon)|khong\s+(?:co|ban|phuc vu).{0,20}suon|껌승.{0,12}(?:없|안\s*팔|판매하지)|돼지.{0,12}(?:없|안\s*팔|판매하지)/i.test(text))return null;
    return {related:true,term:dish.term,evidence:'Google 업소명에서 '+dish.related+' 전문점 확인 · '+dish.term+' 메뉴는 확인 필요',source:{label:'Google 업소명'}};
  }
  function retailProof(place,term,intent){
    const item=window.AIQueryIntent?.searchItemFor(term);
    if(intent.category!=='shopping'||!item?.shopTypes?.some(type=>place.types?.includes(type)))return null;
    // Explicit negative stock/menu evidence is not turned into a positive lead.
    if(sourcesFor(place).some(s=>window.AIQueryIntent.searchItemMatch(s.text,term)&&/없|안\s*팔|품절|판매하지|\b(?:no|not|without)\b|out\s+of\s+stock|khong\s+(?:co|ban)|het\s+hang/i.test(normalize(s.text))))return null;
    return {retail:true,term:item.term,evidence:'Google 관련 판매 업종 확인 · '+item.term+' 취급·재고 확인 필요',source:{label:'Google 업종'}};
  }
  function queryFor(intent,includeRoom=true,includeOrigin=true){
    if(intent.productSearch)return [window.NameSearch?.googleQuery(intent.requestText)||intent.requestText,intent.productKind==='computer'?'computer electronics store':'mobile phone store',CITIES[intent.city]||'','Vietnam'].filter(Boolean).join(' ');
    const terms=(intent.terms||[]).map(term=>window.AIQueryIntent?.searchItemFor(term)?.query||intent.termTranslations?.find(t=>t.term===term)?.vi||intent.termTranslations?.find(t=>t.term===term)?.en||(waxing(term)?'waxing':({'꽃집':'florist','라멘':'ramen','햄버거':'burger','쌀국수':'pho','고기·구이':'BBQ','회':'sashimi','반미':'banh mi','오토바이 대여':'motorbike rental'}[term]||window.NameSearch?.googleQuery(term)||term)));
    const specialty=terms.some(waxing)||intent.terms?.includes('꽃집');
    return [intent.flowerGift?'flower bouquet':'',includeRoom&&window.AIMapSearch?.wantsRoom(intent)?'private dining room':'',...terms,intent.hotelStars?intent.hotelStars+' star':'',specialty?'':({'베이커리':'bakery','호텔':'hotel','로컬 KTV':'local Vietnamese karaoke'}[intent.subcategory]||SUBS[intent.subcategory]||CATEGORIES[intent.category]||''),
      ...(intent.preferences||[]).filter(p=>['quiet','rooftop','cheap','atmosphere','group'].includes(p)).map(p=>p==='group'?'group dining':p==='atmosphere'?'nice atmosphere':p==='cheap'?'affordable':p),
      AREAS[intent.area]||intent.area,intent.district?'Quận '+intent.district:'',includeOrigin&&intent.nearbyOrigin?.name?'near '+(window.NameSearch?.googleQuery(intent.nearbyOrigin.name)||intent.nearbyOrigin.name):'',CITIES[intent.city]||'','Vietnam'].filter(Boolean).join(' ');
  }
  function boundsFor(intent,boundaries,nearby){
    nearby=intent.nearbyOrigin||nearby;
    if(intent.nearby&&nearby){
      const dy=nearby.radius/111320,dx=dy/Math.cos(nearby.lat*Math.PI/180);
      return {north:nearby.lat+dy,south:nearby.lat-dy,east:nearby.lng+dx,west:nearby.lng-dx};
    }
    const feature=intent.city==='hcmc'&&boundaries.find(f=>f.properties?.era==='2020'&&f.properties.sourceName==='Quan '+intent.district);
    if(feature){
      const pairs=feature.geometry.coordinates.flat(feature.geometry.type==='MultiPolygon'?2:1);
      return {north:Math.max(...pairs.map(p=>p[1])),south:Math.min(...pairs.map(p=>p[1])),east:Math.max(...pairs.map(p=>p[0])),west:Math.min(...pairs.map(p=>p[0]))};
    }
    if(intent.nearby&&nearby){
      const dy=nearby.radius/111320,dx=dy/Math.cos(nearby.lat*Math.PI/180);
      return {north:nearby.lat+dy,south:nearby.lat-dy,east:nearby.lng+dx,west:nearby.lng-dx};
    }
    return null;
  }
  function cityMatches(raw,place,city){
    if(city==='all')return true;
    // A nearest-city fallback alone includes adjacent provinces (e.g. Biên Hòa
    // in a Ho Chi Minh query). Google's explicit province must agree first.
    const province=normalize(raw.addressComponents?.find(c=>c.types?.includes('administrative_area_level_1'))?.longText||'');
    const regions={hcmc:/ho chi minh|호치민/,hanoi:/ha noi|hanoi|하노이/,danang:/da nang|다낭/,hoian:/da nang|quang nam|다낭|꽝남/,nhatrang:/khanh hoa|칸호아|카인호아/,dalat:/lam dong|럼동|람동/,muine:/lam dong|binh thuan|람동|럼동|빈투언/,vungtau:/ho chi minh|ba ria|vung tau|호치민|붕따우/,phuquoc:/an giang|kien giang|안장|끼엔장/};
    if(province&&regions[city]&&!regions[city].test(province))return false;
    const address=normalize(place.address);
    if(city==='hcmc'&&/dong nai|bien hoa|동나이|비엔호아/.test(address))return false;
    const explicit=typeof explicitPlaceCityKey==='function'?explicitPlaceCityKey(place):null;
    if(explicit)return explicit===city;
    if(province&&regions[city]?.test(province))return placeCityKey(place)===city;
    // Without an explicit city/province, retain only nearby coordinate-backed
    // candidates. Never assign an arbitrary distant place to its nearest city.
    return !!CITY_DATA[city]?.center&&geoDistanceMeters(place,CITY_DATA[city].center)<=25000&&placeCityKey(place)===city;
  }
  function registeredMatch(row,places){
    const raw={place_id:row.placeId,name:row.name,formatted_address:row.address,geometry:{location:row.position}};
    // Numeric street names (e.g. Đường số 9A) have no name tokens in the
    // photo matcher. Exact name + numbered street + a close pin is sufficient
    // for search deduplication, without changing photo/branch selection rules.
    const exactBranch=p=>{
      if(typeof googlePhotoText!=='function'||googlePhotoText(p.name)!==googlePhotoText(row.name))return false;
      const a=googlePhotoText(String(p.address||'').split(',')[0]),b=googlePhotoText(String(row.address||'').split(',')[0]);
      const position=googlePhotoPosition(p);
      return a.length>=5&&/\d/.test(a)&&a===b&&position&&geoDistanceMeters(position,row.position)<=100;
    };
    return places.find(p=>p.googlePlaceId===row.placeId||
      (typeof googlePhotoSavedId==='function'&&googlePhotoSavedId(googlePhotoKey(p))===row.placeId)||
      (typeof googlePhotoBranchMatches==='function'&&googlePhotoBranchMatches(p,raw))||exactBranch(p))||null;
  }
  function rowsFrom(raw,intent,{boundaries=[],nearby=null,places=[],memberUpdates=new Map()}={}){
    nearby=intent.nearbyOrigin||nearby;
    // Google cannot establish community-only endorsements or partner benefits.
    if(intent.benefit||intent.recommended)return [];
    const seen=new Set(),rows=[];
    for(const p of raw||[]){
      const position=googlePhotoPosition(p.location),rating=Number(p.rating),count=Number(p.userRatingCount);
      if(!p.id||seen.has(p.id)||!position||!Number.isFinite(rating)||rating<4||!Number.isFinite(count)||count<1)continue;
      if(['CLOSED_PERMANENTLY','CLOSED_TEMPORARILY','FUTURE_OPENING'].includes(p.businessStatus))continue;
      const country=p.addressComponents?.find(c=>c.types?.includes('country'));
      if(country&&country.shortText!=='VN')continue;
      const proofs=intent.exploratory?[]:(intent.terms||[]).map(term=>termProof(p,term,intent)||relatedDishProof(p,term)||retailProof(p,term,intent));
      if(!typeMatches(p,intent)||proofs.some(proof=>!proof)||window.AIMapSearch.flowerPurposeMatches?.(p.displayName,intent)===false)continue;
      const place={name:String(p.displayName||'').trim(),address:p.formattedAddress||'',...position};
      if(!cityMatches(p,place,intent.city))continue;
      if(!window.AIMapSearch.districtMatches(place,intent.district,boundaries)||!window.AIMapSearch.areaMatches(place,intent.area))continue;
      if(intent.nearby&&(!nearby||geoDistanceMeters(position,nearby)>nearby.radius))continue;
      const termMatch=!!intent.terms?.length&&intent.terms.every(term=>window.AIMapSearch.menuKeyword(place.name,term));
      const cuisineProof=intent.cuisineAsMenu&&!p.types?.includes(CUISINES[intent.subcategory]?.[1])?window.AIMapSearch.cuisineEvidence(sourcesFor(p),intent.subcategory):null;
      const row={placeId:p.id,name:place.name,address:place.address,position,rating,ratingCount:count,termMatch,source:'google',...(intent.action==='grabfood'?{websiteURI:p.websiteURI||''}:{}),attributions:p.attributions||[],cuisineByMenu:!!cuisineProof,
        proofs:[...(cuisineProof?[cuisineProof]:[]),...proofs].slice(0,2).map(proof=>({...proof,evidence:proof.source.label==='Google 업소 설명'?'Google 업소 설명 · '+p.editorialSummary:proof.evidence}))};
      row.menuUnconfirmed=proofs.filter(proof=>proof.related).map(proof=>proof.term);
      row.itemUnconfirmed=proofs.filter(proof=>proof.retail).map(proof=>proof.term);
      row.insights=window.AISearchInsights?.inspect(p,intent,sourcesFor(p));
      if(intent.nearby&&nearby){row.distance=geoDistanceMeters(position,nearby);row.searchRadius=nearby.radius;}
      if(row.insights?.hotelClass?.kind==='different')continue;
      row.proofs=[...(row.insights?.proofs||[]),...row.proofs].slice(0,3).map(proof=>({...proof,evidence:proof.source.label==='Google 업소 설명'?'Google 업소 설명 · '+p.editorialSummary:proof.evidence}));
      if(window.AIMapSearch.wantsRoom(intent)){
        const sources=[{label:'Google 업소 설명',text:p.editorialSummary||''},...(p.reviews||[]).filter(r=>r.authorAttribution?.displayName).map(review=>({label:'Google 후기',text:review.text||review.originalText||'',review}))];
        row.room=window.AIMapSearch.roomInfo(sources);
        if(row.room.kind==='unavailable')continue;
        // A search hit or a business name is not proof of a dining room.
        // Display Google's editorial summary unchanged when it is the evidence.
        if(row.room.kind==='confirmed'){
          if(row.room.source.review)row.room.review=row.room.source.review;
          else row.room.evidence='Google 업소 설명 · '+p.editorialSummary;
        }
      }
      if(!row.name)continue;
      const member=registeredMatch(row,places);if(member){memberUpdates.set(member.id,row.insights);continue;}
      if(intent.visitToday&&window.AIPlaceHours)row.hours={...window.AIPlaceHours.summarize(p),attributions:row.attributions};
      seen.add(p.id);rows.push(row);
    }
    return rows.sort((a,b)=>Number(b.room?.kind==='confirmed')-Number(a.room?.kind==='confirmed')||(window.AISearchInsights?.compare(a,b,intent)||0)||Number(b.termMatch)-Number(a.termMatch)||b.rating-a.rating||b.ratingCount-a.ratingCount||a.name.localeCompare(b.name));
  }
  async function search(intent,{signal,boundaries=[],nearby=null,places=[]}={}){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(intent.benefit||intent.recommended)return [];
    const Place=window.google?.maps?.places?.Place;
    if(typeof Place?.searchByText!=='function')throw Error('GOOGLE_UNAVAILABLE');
    const fields=['id','displayName','formattedAddress','location','rating','userRatingCount','businessStatus','addressComponents','types','attributions'];
    if(!intent.productSearch&&intent.category!=='shopping')fields.push('priceLevel','priceRange');
    if(intent.action==='grabfood')fields.push('websiteURI');
    const roomSearch=window.AIMapSearch.wantsRoom(intent);
    if(intent.preferences?.includes('group')||intent.terms?.length||roomSearch||intent.cuisineAsMenu||['atmosphere','purpose'].includes(intent.sortBy)||intent.hotelStars)fields.push('editorialSummary','reviews');
    if(intent.visitToday)fields.push('currentOpeningHours');
    const bounds=boundsFor(intent,boundaries,nearby);
    const type=includedType(intent);
    // API discovery already has an exact geographic restriction. Keep the
    // reference name in external Maps links, not in the food query itself.
    const request={textQuery:queryFor(intent,true,false),fields,language:'ko',region:'vn',maxResultCount:20,minRating:4,...(type?{includedType:type,useStrictTypeFiltering:true}:{}),
      ...(bounds?{locationRestriction:bounds}:CITY_DATA[intent.city]?.center?{locationBias:{center:CITY_DATA[intent.city].center,radius:50000}}:{})};
    async function fetchPlaces(textQuery){
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      let timer,abort;
      try{
      const result=await Promise.race([Place.searchByText({...request,textQuery}),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Error('GOOGLE_TIMEOUT')),12000);
        abort=()=>reject(new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',abort,{once:true});
      })]);
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      return result.places||[];
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    }
    const raw=await fetchPlaces(request.textQuery);
    const memberUpdates=new Map();let rows=rowsFrom(raw,intent,{boundaries,nearby,places,memberUpdates});
    // One bounded supplemental request prevents sparse amenity search text
    // hiding the same-area/cuisine inquiry leads. Never loosen type or geography.
    const menuQuery=intent.terms?.includes('고기·구이')?request.textQuery.replace('BBQ','grilled meat'):intent.terms?.includes('회')?request.textQuery.replace('sashimi','횟집 sashimi'):intent.terms?.includes('껌승')?request.textQuery.replace('cơm sườn','cơm tấm sườn'):null;
    const productQuery=intent.productSearch?[/아이폰|iphone|애플|apple/i.test(intent.requestText)?'Apple iPhone':/갤럭시|samsung|삼성/i.test(intent.requestText)?'Samsung':'',intent.productKind==='computer'?'computer electronics store':'mobile phone store',AREAS[intent.area]||intent.area,intent.district?'Quận '+intent.district:'',CITIES[intent.city]||'','Vietnam'].filter(Boolean).join(' '):null;
    if((roomSearch||menuQuery||productQuery)&&rows.length<5){
      try{rows=rowsFrom([...raw,...await fetchPlaces(roomSearch?queryFor(intent,false,false):productQuery||menuQuery)],intent,{boundaries,nearby,places,memberUpdates});}
      catch(error){if(error.name==='AbortError'||!rows.length)throw error;}
    }
    if(location.hostname.endsWith('.netlify.app')&&intent.terms?.some(t=>window.AIQueryIntent?.dishFor(t))){
      console.debug('Map menu search counts',JSON.stringify({received:raw.length,qualified:rows.length,type:raw.filter(p=>typeMatches(p,intent)).length,rated:raw.filter(p=>Number(p.rating)>=4&&Number(p.userRatingCount)>0).length,menu:raw.filter(p=>(intent.terms||[]).every(t=>termProof(p,t)||relatedDishProof(p,t))).length,withinRadius:raw.filter(p=>{const pos=googlePhotoPosition(p.location),o=intent.nearbyOrigin;return pos&&(!o||geoDistanceMeters(pos,o)<=o.radius);}).length}));
    }
    const result=rows.slice(0,20);result.memberUpdates=memberUpdates;return result;
  }
  window.AIGoogleSearch={search,queryFor,rowsFrom,boundsFor,cityMatches,typeMatches,includedType,cuisineWords};
})();
