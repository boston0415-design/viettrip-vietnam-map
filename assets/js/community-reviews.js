// Read-only review feed. Opening it never resets the map's category/rating filters.
const COMMUNITY_REVIEW_PAGE_SIZE=20;
function writtenCommunityReviews(rows){
  return rows.filter(r=>String(r.body??r.text??'').trim().length>0);
}
function reviewPhotoUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'?url.href:null}catch{return null}
}
async function communityRead(table,query){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{headers:SUPABASE_HEADERS,signal:controller.signal});
    if(!response.ok)throw new Error('후기를 불러오지 못했습니다.');
    return await response.json();
  }finally{clearTimeout(timeout)}
}
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.getElementById('communityReviewsDialog');
  const feed=document.getElementById('communityReviewFeed');
  const status=document.getElementById('communityReviewStatus');
  const more=document.getElementById('moreCommunityReviews');
  let offset=0,busy=false,generation=0,scopePlaceId=null;
  const places=new Map();
  function node(tag,text,className){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n}
  async function showPlace(id,button){
    const token=generation;
    button.disabled=true;
    status.textContent='업체와 후기를 불러오는 중…';
    try{
      const rows=await communityRead('places_public',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      if(!rows.length){status.textContent='삭제되었거나 공개되지 않은 업체입니다.';return}
      // Fetch all feedback for this place, including rating-only rows, for correct averages.
      const feedback=[];
      for(let from=0;;from+=500){
        const page=await communityRead('reviews_public',`select=*&place_id=eq.${encodeURIComponent(id)}&order=created_at.desc,id.desc&limit=500&offset=${from}`);
        feedback.push(...page);if(page.length<500)break;
      }
      if(token!==generation||!dialog.open)return;
      const local=db(),place=remotePlaceToLocal(rows[0]);
      local.places=local.places.filter(p=>p.id!==id).concat(place);
      local.reviews=local.reviews.filter(r=>r.placeId!==id).concat(feedback.map(remoteReviewToLocal));
      saveDb(local);
      dialog.close();
      const city=placeCityKey(place);
      if(city&&city!==state.city)switchCity(city);
      closeMobileBusinessList();
      await selectPlace(id,true);
      if(state.selected!==id)return;
      setDetailExpanded(true);
      document.getElementById('detail')?.querySelector('.review')?.scrollIntoView({block:'nearest'});
    }catch{if(token===generation)status.textContent='업체를 불러오지 못했습니다. 잠시 후 다시 눌러주세요.'}
    finally{button.disabled=false}
  }
  function renderRow(review){
    const card=node('article',null,'communityReviewCard');
    const place=places.get(review.place_id);
    const title=node('button',place?`${place.name} ›`:'업체 상세 보기 ›','reviewPlaceLink');
    title.type='button';title.addEventListener('click',()=>showPlace(review.place_id,title));
    card.append(title);
    if(place?.address)card.append(node('p',place.address,'reviewPlaceAddress'));
    const meta=node('div',null,'communityReviewMeta');
    meta.append(node('strong',review.author_name||'회원'));
    if(review.rating!=null)meta.append(node('span',`★ ${Number(review.rating).toFixed(1)}`,'communityReviewRating'));
    const date=new Date(review.created_at);
    if(!Number.isNaN(date.getTime())){const time=node('time',date.toLocaleDateString('ko-KR'));time.dateTime=date.toISOString();meta.append(time)}
    card.append(meta,node('p',review.body,'communityReviewText'));
    const cafeUrl=normalizeCafeReviewUrl(review.cafe_url);
    if(cafeUrl){const link=node('a','카페 후기 원문 보기 ↗','cafeOriginalLink');link.href=cafeUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
    const photos=node('div',null,'communityReviewPhotos');
    for(const value of (Array.isArray(review.photo_urls)?review.photo_urls:[]).slice(0,3)){
      const url=reviewPhotoUrl(value);if(!url)continue;
      const a=node('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
      const img=node('img');img.src=url;img.alt='회원이 남긴 후기 사진';img.loading='lazy';a.append(img);photos.append(a);
    }
    card.append(photos);return card;
  }
  async function load(){
    if(busy)return;busy=true;more.disabled=true;status.textContent='후기 불러오는 중…';
    const token=generation;
    try{
      const rows=await communityRead('reviews_public',`select=id,place_id,author_name,rating,body,photo_urls,created_at,cafe_url${scopePlaceId?'&place_id=eq.'+encodeURIComponent(scopePlaceId):''}&body=not.is.null&body=neq.&order=created_at.desc,id.desc&limit=${COMMUNITY_REVIEW_PAGE_SIZE}&offset=${offset}`);
      const ids=[...new Set(rows.map(r=>r.place_id))].filter(id=>/^[0-9a-f-]{36}$/i.test(id));
      if(ids.length){
        const found=await communityRead('places_public',`select=id,name,address&id=in.(${ids.join(',')})`);
        found.forEach(p=>places.set(p.id,p));
      }
      if(token!==generation)return;
      writtenCommunityReviews(rows).forEach(r=>feed.append(renderRow(r)));
      offset+=rows.length;more.hidden=rows.length<COMMUNITY_REVIEW_PAGE_SIZE;more.textContent='후기 더 보기';
      status.textContent=feed.children.length?'업체명을 누르면 업체 정보와 후기를 함께 볼 수 있습니다.':'아직 작성된 회원 후기가 없습니다. 별점만 남긴 평가는 이 목록에 표시되지 않습니다.';
    }catch{
      if(token!==generation)return;
      status.textContent='후기를 불러오지 못했습니다. 연결을 확인하고 다시 시도해주세요.';
      more.textContent='다시 시도';more.hidden=false;
    }finally{if(token===generation){busy=false;more.disabled=false}}
  }
  function openFeed(place=null){
    scopePlaceId=place?.id||null;
    generation++;busy=false;offset=0;places.clear();feed.replaceChildren();more.hidden=true;
    document.getElementById('communityReviewsTitle').textContent=place?`${place.name} 후기`:'회원 후기';
    dialog.querySelector('.travellerDialogHead p').textContent=place?'이 업체의 방문 후기 · 최근 작성순':'전체 지역의 방문 후기 · 최근 작성순';
    dialog.showModal();load();
  }
  document.getElementById('openCommunityReviews').addEventListener('click',()=>openFeed());
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-place-reviews]');if(!button)return;
    const place=db().places.find(p=>p.id===button.dataset.placeReviews);
    if(place)openFeed(place);
  });
  more.addEventListener('click',load);
  document.querySelectorAll('.travellerDialog').forEach(d=>{
    d.querySelector('[data-traveller-close]')?.addEventListener('click',()=>d.close());
    d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close()}});
  });
});
