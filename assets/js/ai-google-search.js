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
  const sourcesFor=place=>[{label:'Google 업소명',text:place.displayName||''},{label:'Google 업소 설명',text:place.editorialSummary||''},...(place.reviews||[]).filter(r=>r.authorAttribution?.displayName).map(review=>({label:'Google 후기',text:review.text||review.originalText||'',review}))];
  function includedType(intent){
    if(intent.subcategory==='베이커리')return 'bakery';
    if(intent.subcategory==='호텔')return 'hotel';
    if(intent.category==='restaurant')return intent.cuisineAsMenu?'restaurant':CUISINES[intent.subcategory]?.[1]||'restaurant';
    if(intent.category==='bar'&&intent.subcategory==='클럽')return 'night_club';
    return '';
  }
  function typeMatches(place,intent){
    const types=place.types||[];
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
  function termProof(place,term){
    if(term==='고기·구이'&&(place.types||[]).some(type=>['barbecue_restaurant','korean_barbecue_restaurant'].includes(type)))return {evidence:'Google 업종 · 고기·구이',source:{label:'Google 업종'}};
    return window.AIMapSearch.evidenceFor(sourcesFor(place),term);
  }
  function queryFor(intent,includeRoom=true){
    const terms=(intent.terms||[]).map(term=>waxing(term)?'waxing':({'고기·구이':'BBQ','회':'sashimi','반미':'banh mi','오토바이 대여':'motorbike rental'}[term]||term));
    const specialty=terms.some(waxing);
    return [includeRoom&&window.AIMapSearch?.wantsRoom(intent)?'private dining room':'',...terms,intent.hotelStars?intent.hotelStars+' star':'',specialty?'':({'베이커리':'bakery','호텔':'hotel','로컬 KTV':'local Vietnamese karaoke'}[intent.subcategory]||SUBS[intent.subcategory]||CATEGORIES[intent.category]||''),
      ...(intent.preferences||[]).filter(p=>['quiet','rooftop','cheap','atmosphere'].includes(p)).map(p=>p==='atmosphere'?'nice atmosphere':p==='cheap'?'affordable':p),
      AREAS[intent.area]||intent.area,intent.district?'Quận '+intent.district:'',CITIES[intent.city]||'','Vietnam'].filter(Boolean).join(' ');
  }
  function boundsFor(intent,boundaries,nearby){
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
    // Google cannot establish community-only endorsements or partner benefits.
    if(intent.benefit||intent.recommended)return [];
    const seen=new Set(),rows=[];
    for(const p of raw||[]){
      const position=googlePhotoPosition(p.location),rating=Number(p.rating),count=Number(p.userRatingCount);
      if(!p.id||seen.has(p.id)||!position||!Number.isFinite(rating)||rating<4||!Number.isFinite(count)||count<1)continue;
      if(['CLOSED_PERMANENTLY','CLOSED_TEMPORARILY','FUTURE_OPENING'].includes(p.businessStatus))continue;
      const country=p.addressComponents?.find(c=>c.types?.includes('country'));
      if(country&&country.shortText!=='VN')continue;
      const proofs=(intent.terms||[]).map(term=>termProof(p,term));
      if(!typeMatches(p,intent)||proofs.some(proof=>!proof))continue;
      const place={name:String(p.displayName||'').trim(),address:p.formattedAddress||'',...position};
      if(intent.city!=='all'&&placeCityKey(place)!==intent.city)continue;
      if(!window.AIMapSearch.districtMatches(place,intent.district,boundaries)||!window.AIMapSearch.areaMatches(place,intent.area))continue;
      if(intent.nearby&&(!nearby||geoDistanceMeters(position,nearby)>nearby.radius))continue;
      const termMatch=!!intent.terms?.length&&intent.terms.every(term=>window.AIMapSearch.menuKeyword(place.name,term));
      const cuisineProof=intent.cuisineAsMenu&&!p.types?.includes(CUISINES[intent.subcategory]?.[1])?window.AIMapSearch.cuisineEvidence(sourcesFor(p),intent.subcategory):null;
      const row={placeId:p.id,name:place.name,address:place.address,position,rating,ratingCount:count,termMatch,source:'google',attributions:p.attributions||[],cuisineByMenu:!!cuisineProof,
        proofs:[...(cuisineProof?[cuisineProof]:[]),...proofs].slice(0,2).map(proof=>({...proof,evidence:proof.source.label==='Google 업소 설명'?'Google 업소 설명 · '+p.editorialSummary:proof.evidence}))};
      row.insights=window.AISearchInsights?.inspect(p,intent,sourcesFor(p));
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
    const fields=['id','displayName','formattedAddress','location','rating','userRatingCount','businessStatus','addressComponents','types','attributions','priceLevel','priceRange'];
    const roomSearch=window.AIMapSearch.wantsRoom(intent);
    if(intent.terms?.length||roomSearch||intent.cuisineAsMenu||intent.sortBy==='atmosphere'||intent.hotelStars)fields.push('editorialSummary','reviews');
    if(intent.visitToday)fields.push('currentOpeningHours');
    const bounds=boundsFor(intent,boundaries,nearby);
    const type=includedType(intent);
    const request={textQuery:queryFor(intent),fields,language:'ko',region:'vn',maxResultCount:20,minRating:4,...(type?{includedType:type,useStrictTypeFiltering:true}:{}),
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
    const menuQuery=intent.terms?.includes('고기·구이')?request.textQuery.replace('BBQ','grilled meat'):intent.terms?.includes('회')?request.textQuery.replace('sashimi','횟집 sashimi'):null;
    if((roomSearch||menuQuery)&&rows.length<5){
      try{rows=rowsFrom([...raw,...await fetchPlaces(roomSearch?queryFor(intent,false):menuQuery)],intent,{boundaries,nearby,places,memberUpdates});}
      catch(error){if(error.name==='AbortError'||!rows.length)throw error;}
    }
    const result=rows.slice(0,20);result.memberUpdates=memberUpdates;return result;
  }
  window.AIGoogleSearch={search,queryFor,rowsFrom,boundsFor,typeMatches,includedType,cuisineWords};
})();
