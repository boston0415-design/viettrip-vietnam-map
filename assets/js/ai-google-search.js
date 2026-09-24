/* Read-only Google discovery. Results stay in this search, never in member data. */
(() => {
  'use strict';
  const CITIES={hcmc:'Ho Chi Minh City',hanoi:'Ha Noi',danang:'Da Nang',nhatrang:'Nha Trang',phuquoc:'Phu Quoc',dalat:'Da Lat',hoian:'Hoi An',vungtau:'Vung Tau',muine:'Mui Ne'};
  const CATEGORIES={restaurant:'restaurant',spa:'spa massage',barber:'barber hair salon',stay:'hotel',karaoke:'karaoke',cafe:'cafe',exchange:'currency exchange',shopping:'shopping',market:'market',attraction:'tourist attraction',bar:'bar',golf:'golf course',pharmacy:'pharmacy',public_office:'government office',hospital:'hospital'};
  const SUBS={'한식':'Korean restaurant','일식':'Japanese restaurant','베트남':'Vietnamese restaurant','중식':'Chinese restaurant','바':'bar','클럽':'night club'};
  const AREAS={'푸미흥':'Phu My Hung','타오디엔':'Thao Dien','호안끼엠':'Hoan Kiem','미딩':'My Dinh','서호':'Tay Ho','부이비엔':'Bui Vien','레탄톤':'Le Thanh Ton'};
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
  const waxing=term=>/왁싱|wax(?:ing)?|wax long/i.test(normalize(term));
  function queryFor(intent){
    const terms=(intent.terms||[]).map(term=>waxing(term)?'waxing':term);
    const specialty=terms.some(waxing);
    return [...terms,specialty?'':SUBS[intent.subcategory]||CATEGORIES[intent.category]||'',
      ...(intent.preferences||[]).filter(p=>['quiet','rooftop'].includes(p)),
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
    return places.find(p=>p.googlePlaceId===row.placeId||
      (typeof googlePhotoSavedId==='function'&&googlePhotoSavedId(googlePhotoKey(p))===row.placeId)||
      (typeof googlePhotoBranchMatches==='function'&&googlePhotoBranchMatches(p,raw)))||null;
  }
  function rowsFrom(raw,intent,{boundaries=[],nearby=null,places=[]}={}){
    const seen=new Set(),rows=[];
    for(const p of raw||[]){
      const position=googlePhotoPosition(p.location),rating=Number(p.rating),count=Number(p.userRatingCount);
      if(!p.id||seen.has(p.id)||!position||!Number.isFinite(rating)||rating<4||!Number.isFinite(count)||count<1)continue;
      if(['CLOSED_PERMANENTLY','CLOSED_TEMPORARILY','FUTURE_OPENING'].includes(p.businessStatus))continue;
      const country=p.addressComponents?.find(c=>c.types?.includes('country'));
      if(country&&country.shortText!=='VN')continue;
      const place={name:googlePhotoText(p.displayName),address:p.formattedAddress||'',...position};
      if(intent.city!=='all'&&placeCityKey(place)!==intent.city)continue;
      if(!window.AIMapSearch.districtMatches(place,intent.district,boundaries)||!window.AIMapSearch.areaMatches(place,intent.area))continue;
      if(intent.nearby&&(!nearby||geoDistanceMeters(position,nearby)>nearby.radius))continue;
      const row={placeId:p.id,name:place.name,address:place.address,position,rating,ratingCount:count,source:'google',attributions:p.attributions||[]};
      if(!row.name||registeredMatch(row,places))continue;
      if(intent.visitToday&&window.AIPlaceHours)row.hours={...window.AIPlaceHours.summarize(p),attributions:row.attributions};
      seen.add(p.id);rows.push(row);
    }
    return rows.sort((a,b)=>b.rating-a.rating||b.ratingCount-a.ratingCount||a.name.localeCompare(b.name));
  }
  async function search(intent,{signal,boundaries=[],nearby=null,places=[]}={}){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const Place=window.google?.maps?.places?.Place;
    if(typeof Place?.searchByText!=='function')throw Error('GOOGLE_UNAVAILABLE');
    const fields=['id','displayName','formattedAddress','location','rating','userRatingCount','businessStatus','addressComponents','attributions'];
    if(intent.visitToday)fields.push('currentOpeningHours');
    const bounds=boundsFor(intent,boundaries,nearby);
    const request={textQuery:queryFor(intent),fields,language:'ko',region:'vn',maxResultCount:20,minRating:4,
      ...(bounds?{locationRestriction:bounds}:CITY_DATA[intent.city]?.center?{locationBias:{center:CITY_DATA[intent.city].center,radius:50000}}:{})};
    let timer,abort;
    try{
      const result=await Promise.race([Place.searchByText(request),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Error('GOOGLE_TIMEOUT')),12000);
        abort=()=>reject(new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',abort,{once:true});
      })]);
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      return rowsFrom(result.places,intent,{boundaries,nearby,places});
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  window.AIGoogleSearch={search,queryFor,rowsFrom,boundsFor};
})();
