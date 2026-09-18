/* Google photos are displayed live, never copied into member uploads or storage.
 * Only a confirmed place_id may be persisted; all photo data belongs to the
 * current detail panel and is discarded when the selection closes/changes. */
const GOOGLE_PHOTO_ID_KEY='viettrip_google_photo_ids_v1';
let activeGooglePhotoPanel=null;

function googlePhotoText(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').normalize('NFC').toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').trim();
}
function googlePhotoNameGroups(name){
  const generic=new Set('restaurant restaurants hotel hotels spa massage karaoke ktv club bar cafe coffee nha hang quan nha trang ho chi minh city saigon sai gon vietnam viet nam live music business 베트남 호치민 나트랑 식당 레스토랑 호텔 마사지 스파 가라오케 클럽 카페'.split(' '));
  const text=googlePhotoText(name);
  return [text.match(/[a-z][a-z0-9]*/g)||[],text.match(/[가-힣]+/g)||[]]
    .map(words=>words.filter(word=>word.length>1&&!generic.has(word))).filter(words=>words.length);
}
function googlePhotoNameMatches(registered,found){
  const foundText=googlePhotoText(found),foundWords=new Set(foundText.split(' '));
  const compact=foundText.replace(/ /g,'');
  return googlePhotoNameGroups(registered).some(words=>{
    const joined=words.join('');
    if(joined.length>=5&&compact.includes(joined))return true;
    return words.filter(word=>foundWords.has(word)).length/words.length>=.75;
  });
}
function googlePhotoStreet(address){
  const first=String(address||'').split(',')[0];
  const normalized=googlePhotoText(first);
  const house=first.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .match(/^\s*(?:lo\s+)?(\d+[a-z]?(?:\s*[-/]\s*\d+[a-z]?)*)\b/);
  const ignored=new Set(['d','duong','so','street','st','road','rd','lo']);
  const words=normalized.split(' ').filter(word=>word.length>1&&!/^[0-9]+[a-z]?$/.test(word)&&!ignored.has(word));
  return {house:house?house[1].replace(/\s/g,'').replace(/\d+/g,n=>String(Number(n))):null,words};
}
function googlePhotoPosition(place){
  const location=place?.geometry?.location||place;
  const lat=typeof location?.lat==='function'?location.lat():location?.lat;
  const lng=typeof location?.lng==='function'?location.lng():location?.lng;
  if(lat==null||lng==null||lat===''||lng==='')return null;
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||Math.abs(Number(lat))>90||Math.abs(Number(lng))>180)return null;
  return {lat:Number(lat),lng:Number(lng)};
}
function googlePhotoBranchMatches(registered,found){
  if(!found?.place_id||!googlePhotoNameMatches(registered.name,found.name))return false;
  const a=googlePhotoPosition(registered),b=googlePhotoPosition(found);
  if(!a||!b)return false;
  const rad=Math.PI/180;
  const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  const meters=6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
  if(meters>250)return false;
  const x=googlePhotoStreet(registered.address),y=googlePhotoStreet(found.formatted_address);
  // A matching chain name or a nearby pin alone must not select another branch.
  if(x.house&&y.house&&x.house!==y.house)return false;
  if(x.house&&y.house){
    return x.words.length>0&&y.words.length>0&&x.words.filter(word=>y.words.includes(word)).length/Math.min(x.words.length,y.words.length)>=.75;
  }
  // Incomplete addresses need a closer location and the full registered name.
  const name=googlePhotoText(registered.name).replace(/ /g,'');
  const foundName=googlePhotoText(found.name).replace(/ /g,'');
  return meters<=100&&name.length>=4&&name===foundName;
}
function googlePhotoKey(place){
  return JSON.stringify([place.id,place.name,place.address,place.lat,place.lng]);
}
function googlePhotoSavedId(key,id){
  try{
    const stored=JSON.parse(localStorage.getItem(GOOGLE_PHOTO_ID_KEY)||'{}');
    const entries=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
    if(arguments.length===1)return typeof entries[key]==='string'?entries[key]:null;
    if(id)entries[key]=id;else delete entries[key];
    localStorage.setItem(GOOGLE_PHOTO_ID_KEY,JSON.stringify(Object.fromEntries(Object.entries(entries).slice(-200))));
  }catch(_){}
  return null;
}
function googlePhotoMapsUrl(place,placeId){
  const url=new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api','1');
  url.searchParams.set('query',[place.name,place.address].filter(Boolean).join(' '));
  if(placeId)url.searchParams.set('query_place_id',placeId);
  return url.href;
}
function googlePhotoSafeUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url.href:null}catch(_){return null}
}
function googlePhotoAttribution(html){
  const template=document.createElement('template');template.innerHTML=String(html||'');
  const fragment=document.createDocumentFragment();
  function copy(source,parent){
    if(source.nodeType===3){parent.append(document.createTextNode(source.textContent));return;}
    if(source.nodeType!==1||/^(SCRIPT|STYLE|IFRAME|IMG|SVG|OBJECT|TEMPLATE)$/.test(source.tagName))return;
    if(source.tagName==='A'){
      const href=googlePhotoSafeUrl(source.getAttribute('href'));
      if(href){const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.textContent;parent.append(link);return;}
    }
    for(const child of source.childNodes)copy(child,parent);
  }
  for(const child of template.content.childNodes)copy(child,fragment);
  return fragment;
}
function googlePhotoRequest(service,method,request){
  return new Promise((resolve,reject)=>{
    let done=false;
    const timeout=setTimeout(()=>finish(null,'TIMEOUT'),10000);
    function finish(result,status){
      if(done)return;done=true;clearTimeout(timeout);
      if(status==='OK'||status==='ZERO_RESULTS')resolve(result);else reject(new Error(status||'UNAVAILABLE'));
    }
    try{service[method](request,finish)}catch(_){finish(null,'UNAVAILABLE')}
  });
}
function clearGooglePlacePhotos(){activeGooglePhotoPanel=null;}

function syncGooglePlacePhotos(){
  const place=db().places.find(p=>p.id===state.selected);
  const holder=document.getElementById('googlePlacePhotoSlot');
  if(!place||!document.getElementById('detail')?.classList.contains('show')){clearGooglePlacePhotos();return;}
  const key=googlePhotoKey(place);
  if(activeGooglePhotoPanel?.key!==key)clearGooglePlacePhotos();
  if(!holder||document.getElementById('detailBody')?.hidden)return;
  if(activeGooglePhotoPanel){holder.replaceChildren(activeGooglePhotoPanel.node);return;}
  const node=document.createElement('section');node.className='googlePlacePhotos';node.setAttribute('aria-label','Google 지도 업소 사진');
  const header=document.createElement('div');header.className='googlePhotoHeader';
  const title=document.createElement('strong');title.textContent='업소 사진';
  const maps=document.createElement('a');maps.href=googlePhotoMapsUrl(place);maps.target='_blank';maps.rel='noopener noreferrer';maps.textContent='Google 지도에서 보기 ↗';
  header.append(title,maps);
  const body=document.createElement('div');body.className='googlePhotoContent';
  const status=document.createElement('p');status.className='googlePhotoStatus';status.setAttribute('role','status');status.textContent='업소 사진을 확인하고 있어요…';body.append(status);
  const info=document.createElement('a');info.className='googlePhotoInfo';info.href='./guide/photos.html';info.target='_blank';info.rel='noopener noreferrer';info.textContent='사진·출처 안내';
  node.append(header,body,info);holder.replaceChildren(node);
  const entry={key,node,place:{...place},body,maps,status};activeGooglePhotoPanel=entry;
  loadGooglePlacePhotos(entry);
}
async function loadGooglePlacePhotos(entry){
  const current=()=>activeGooglePhotoPanel===entry;
  const empty=message=>{if(current()){entry.status.textContent=message;entry.body.replaceChildren(entry.status)}};
  try{
    const Places=window.google?.maps?.places?.PlacesService;
    if(!Places||!state.map)throw Error('UNAVAILABLE');
    const service=new Places(state.map),savedId=googlePhotoSavedId(entry.key);
    let placeId=savedId;
    if(!placeId){
      const position=googlePhotoPosition(entry.place);
      if(!position){empty('사진은 Google 지도에서 확인해 주세요.');return;}
      const candidates=await googlePhotoRequest(service,'findPlaceFromQuery',{
        query:[entry.place.name,entry.place.address].filter(Boolean).join(' '),
        fields:['place_id','name','formatted_address','geometry'],
        locationBias:{center:position,radius:500}
      });
      if(!current())return;
      const matching=[...new Map((candidates||[]).filter(p=>googlePhotoBranchMatches(entry.place,p)).map(p=>[p.place_id,p])).values()];
      if(matching.length!==1){empty('이 지점의 사진을 확인하지 못했어요. Google 지도에서 확인해 주세요.');return;}
      placeId=matching[0].place_id;
    }
    if(!current())return;
    const result=await googlePhotoRequest(service,'getDetails',{
      placeId,fields:['place_id','name','formatted_address','geometry','photos']
    });
    if(!current())return;
    if(!googlePhotoBranchMatches(entry.place,result)||result.place_id!==placeId){
      googlePhotoSavedId(entry.key,null);empty('이 지점의 사진을 확인하지 못했어요. Google 지도에서 확인해 주세요.');return;
    }
    googlePhotoSavedId(entry.key,placeId);
    entry.maps.href=googlePhotoMapsUrl(entry.place,placeId);
    const photos=(result.photos||[]).filter(photo=>typeof photo?.getUrl==='function').slice(0,3);
    if(!photos.length){empty('Google 지도에 공개된 사진이 없어요.');return;}
    entry.body.replaceChildren();
    const grid=document.createElement('div');grid.className='googlePhotoGrid';entry.body.append(grid);
    const attribution=document.createElement('div');attribution.className='googlePhotoProvider';
    for(const html of result.html_attributions||[]){const item=document.createElement('span');item.append(googlePhotoAttribution(html));attribution.append(item);}
    if(attribution.childNodes.length)entry.body.append(attribution);
    let rendered=0;
    for(const [index,photo] of photos.entries()){
      let url;try{url=googlePhotoSafeUrl(photo.getUrl({maxWidth:480,maxHeight:360}))}catch(_){continue}
      if(!url)continue;
      const figure=document.createElement('figure');
      const link=document.createElement('a');link.className='googlePhotoImageLink';link.href=entry.maps.href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',entry.place.name+' 사진 '+(index+1)+' · Google 지도에서 보기');
      const image=document.createElement('img');image.alt=entry.place.name+' · Google 지도 사진 '+(index+1);image.width=240;image.height=180;image.decoding='async';
      image.addEventListener('error',()=>{figure.remove();if(!grid.children.length)empty('사진을 불러오지 못했어요. Google 지도에서 확인해 주세요.');},{once:true});
      image.src=url;link.append(image);figure.append(link);
      const credit=document.createElement('figcaption');credit.append(document.createTextNode('사진: '));
      const authors=photo.html_attributions||[];
      if(authors.length)for(const [i,html] of authors.entries()){if(i)credit.append(document.createTextNode(' · '));credit.append(googlePhotoAttribution(html));}
      else credit.append(document.createTextNode('Google 지도'));
      figure.append(credit);grid.append(figure);rendered++;
    }
    if(!rendered)empty('사진을 불러오지 못했어요. Google 지도에서 확인해 주세요.');
  }catch(error){
    if(!current())return;
    if(error.message==='NOT_FOUND'||error.message==='INVALID_REQUEST')googlePhotoSavedId(entry.key,null);
    empty('사진 연결이 지연되고 있어요. 잠시 후 다시 확인해 주세요.');
    const retry=document.createElement('button');retry.type='button';retry.className='googlePhotoRetry';retry.textContent='다시 불러오기';
    retry.onclick=()=>{if(current()){clearGooglePlacePhotos();syncGooglePlacePhotos()}};entry.body.append(retry);
  }
}
