/* Read-only, on-demand hours. Google content stays with the current AI result;
 * only a verified Google place ID may be remembered by the existing resolver. */
(() => {
  'use strict';
  const DAY=1440,WEEK=7*DAY;
  const unknown=()=>({kind:'unknown',label:'오늘 영업 확인 불가',hours:'',available:null});
  const clock=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
  function summarize(raw,now=new Date(),source='current'){
    const base={...unknown(),source,checkedAt:now.toISOString()};
    const status=raw.businessStatus||raw.business_status;
    if(['CLOSED_PERMANENTLY','CLOSED_TEMPORARILY','FUTURE_OPENING'].includes(status))return {...base,kind:'closed',available:false,label:status==='CLOSED_PERMANENTLY'?'폐업':status==='CLOSED_TEMPORARILY'?'임시 휴업':'개업 전'};
    const hours=source==='current'?raw.currentOpeningHours:(raw.regularOpeningHours||raw.opening_hours);
    if(!hours||!Array.isArray(hours.periods))return base;
    // Every supported map city is in Vietnam (UTC+7); the visitor's device zone
    // must never select the wrong weekday or classify an evening venue as shut.
    const local=new Date(now.getTime()+420*60000),start=local.getUTCDay()*DAY,end=start+DAY,minute=start+local.getUTCHours()*60+local.getUTCMinutes();
    const point=p=>p&&Number.isInteger(p.day)&&p.day>=0&&p.day<=6&&Number.isInteger(p.hour??p.hours)&&Number.isInteger(p.minute??p.minutes)&&(p.hour??p.hours)>=0&&(p.hour??p.hours)<24&&(p.minute??p.minutes)>=0&&(p.minute??p.minutes)<60?p.day*DAY+(p.hour??p.hours)*60+(p.minute??p.minutes):null;
    const ranges=[];
    for(const period of hours.periods){
      const open=point(period.open),close=point(period.close);
      if(open==null)return base;
      if(close==null){
        if(hours.periods.length===1&&open===0&&!period.close){ranges.push([start,end]);continue;}
        return base;
      }
      const closing=close<=open?close+WEEK:close;
      for(const shift of [-WEEK,0,WEEK])if(open+shift<end&&closing+shift>start)ranges.push([Math.max(start,open+shift),closing+shift]);
    }
    ranges.sort((a,b)=>a[0]-b[0]);
    if(!ranges.length)return {...base,kind:'closed',label:'오늘 휴무',available:false};
    const formatEnd=n=>n>end?'다음 날 '+clock((n-end)%DAY):clock(n-start);
    const text=ranges.length===1&&ranges[0][0]===start&&ranges[0][1]>=end?'오늘 24시간': '오늘 '+ranges.map(([a,b])=>clock(a-start)+'–'+formatEnd(b)).join(' / ');
    const current=ranges.some(([a,b])=>a<=minute&&minute<b),upcoming=ranges.find(([a])=>a>minute);
    return {...base,hours:text,available:current||!!upcoming,kind:current?'open':upcoming?'later':'closed',label:current?'지금 영업 중':upcoming?clock(upcoming[0]-start)+' 영업 예정':'오늘 영업 종료'};
  }
  async function bounded(promise,signal){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    let timer,abort;
    try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('TIMEOUT')),10000);
      abort=()=>reject(new DOMException('Cancelled','AbortError'));
      signal?.addEventListener('abort',abort,{once:true});
    })]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function lookup(place,{signal,now=new Date()}={}){
    const unavailable={...unknown(),source:'unknown',checkedAt:now.toISOString()};
    const active=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};
    try{
      active();
      const lib=window.google?.maps?.places;
      if(!lib?.PlacesService||!state.map)return unavailable;
      const service=new lib.PlacesService(state.map),key=googlePhotoKey(place);
      let id=place.googlePlaceId||googlePhotoSavedId(key);
      if(!id){
        const location=googlePhotoPosition(place);if(!location)return unavailable;
        const found=await bounded(googlePhotoRequest(service,'findPlaceFromQuery',{query:[place.name,place.address].filter(Boolean).join(' '),fields:['place_id','name','formatted_address','geometry'],locationBias:{center:location,radius:500}}),signal);
        active();
        const matches=[...new Map((found||[]).filter(p=>googlePhotoBranchMatches(place,p)).map(p=>[p.place_id,p])).values()];
        if(matches.length!==1)return unavailable;
        id=matches[0].place_id;
      }
      if(lib.Place){
        try{
          active();const detail=new lib.Place({id,requestedLanguage:'ko',requestedRegion:'vn'});
          await bounded(detail.fetchFields({fields:['displayName','formattedAddress','location','businessStatus','currentOpeningHours','utcOffsetMinutes','attributions']}),signal);
          active();
          if(!googlePhotoBranchMatches(place,{place_id:id,name:detail.displayName,formatted_address:detail.formattedAddress,geometry:{location:detail.location}}))return unavailable;
          googlePhotoSavedId(key,id);
          const result=summarize(detail,now,'current');
          if(result.kind!=='unknown')return {...result,placeId:id,attributions:detail.attributions||[]};
        }catch(error){if(error.name==='AbortError')throw error;}
      }
      // Legacy projects can still display the regular timetable, explicitly
      // distinguished from today's exceptional/holiday hours.
      active();
      const detail=await bounded(googlePhotoRequest(service,'getDetails',{placeId:id,fields:['place_id','name','formatted_address','geometry','business_status','opening_hours','utc_offset_minutes']}),signal);
      active();
      if(!googlePhotoBranchMatches(place,detail)||detail.place_id!==id)return unavailable;
      googlePhotoSavedId(key,id);
      return {...summarize(detail,now,'regular'),placeId:id,attributions:detail.html_attributions||[]};
    }catch(error){if(error.name==='AbortError')throw error;return unavailable;}
  }
  async function checkAll(rows,{signal,onResult}={}){
    let cursor=0;const now=new Date();
    await Promise.all(Array.from({length:Math.min(3,rows.length)},async()=>{
      while(cursor<rows.length&&!signal?.aborted){const row=rows[cursor++];try{const result=await lookup(row.place,{signal,now});if(!signal?.aborted)onResult(row,result);}catch(error){if(error.name!=='AbortError')throw error;}}
    }));
  }
  window.AIPlaceHours={lookup,summarize,checkAll};
})();
