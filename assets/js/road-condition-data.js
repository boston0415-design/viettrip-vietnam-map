/* Shared validation for the published feed, browser overlays and build gate. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoadConditionData=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const HOUR=3600000,TTL={flood:6*HOUR,construction:7*24*HOUR};
  const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  const time=v=>typeof v==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(v)?Date.parse(v):NaN;
  function sourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  function point(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=102&&p[0]<=110&&p[1]>=8&&p[1]<=24;}
  function geometry(g){
    if(g?.type==='Point')return point(g.coordinates);
    if(g?.type==='LineString')return Array.isArray(g.coordinates)&&g.coordinates.length>=2&&g.coordinates.length<=100&&g.coordinates.every(point);
    if(g?.type==='Polygon'){
      if(!Array.isArray(g.coordinates)||g.coordinates.length!==1)return false;
      const ring=g.coordinates[0];return Array.isArray(ring)&&ring.length>=4&&ring.length<=100&&ring.every(point)&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1];
    }
    return false;
  }
  function valid(row){
    const observed=time(row?.observedAt),verified=time(row?.verifiedAt),until=time(row?.expiresAt);
    return !!(row&&typeof row.id==='string'&&/^[a-z0-9-]{3,80}$/.test(row.id)&&Object.hasOwn(TTL,row.kind)&&text(row.city,30)&&
      text(row.title,120)&&text(row.description,700)&&geometry(row.geometry)&&
      ['official','community'].includes(row.source?.type)&&text(row.source?.name,100)&&text(row.source?.url,1500)&&sourceUrl(row.source?.url)&&text(row.reviewedBy,80)&&
      Number.isFinite(observed)&&Number.isFinite(verified)&&Number.isFinite(until)&&observed<=verified&&verified<until&&
      until-verified<=TTL[row.kind]&&(row.kind!=='flood'||until-observed<=TTL.flood));
  }
  function parse(feed){
    if(feed?.version!==1||!Number.isFinite(time(feed.updatedAt))||!Array.isArray(feed.incidents)||feed.incidents.length>200)throw Error('도로 정보 형식을 확인하지 못했습니다.');
    const ids=new Set();
    for(const row of feed.incidents){if(!valid(row)||ids.has(row.id))throw Error('도로 정보의 출처·위치·유효기간을 확인하지 못했습니다.');ids.add(row.id);}
    return feed;
  }
  function active(feed,now=Date.now(),city='all'){
    return (feed?.incidents||[]).filter(row=>valid(row)&&time(row.observedAt)<=now&&time(row.verifiedAt)<=now&&time(row.expiresAt)>now&&(city==='all'||row.city===city));
  }
  function anchor(row){const g=row.geometry,c=g.type==='Point'?g.coordinates:g.type==='Polygon'?g.coordinates[0][0]:g.coordinates[0];return {lat:c[1],lng:c[0]};}
  return {TTL,sourceUrl,point,geometry,valid,parse,active,anchor};
});
