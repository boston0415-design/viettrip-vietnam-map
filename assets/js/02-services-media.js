function setDbStatus(text,ok=false){
  const el=$('#dbStatus');
  if(!el)return;
  el.textContent=text;
  el.style.color=ok?'#0b8f52':'#64748b';
}

function placeToRemote(p){
  return {
    id:p.id,
    client_id:p.id,
    name:p.name,
    category:p.category,
    subcategory:p.subcategory||null,
    area:p.area||null,
    address:p.address||null,
    lat:Number(p.lat),
    lng:Number(p.lng),
    description:p.description||null,
    initial_rating:p.initialRating!=null&&Number.isFinite(Number(p.initialRating))?Number(p.initialRating):null,
    member_benefit:!!p.memberBenefit,
    benefit_text:p.benefitText||null,
    photo_urls:Array.isArray(p.photoUrls)?p.photoUrls.slice(0,5):[],
    tags:Array.isArray(p.tags)?p.tags:[],
    created_by:getDeviceId()
  };
}

function reviewToRemote(r){
  return {
    id:r.id,
    client_id:r.id,
    place_id:r.placeId,
    rating:r.rating==null?null:Number(r.rating),
    body:r.text||null,
    author_name:r.nickname||null,
    created_by:r.createdBy || getDeviceId(),
    created_at:r.createdAt||new Date().toISOString(),
    photo_urls:Array.isArray(r.photoUrls)?r.photoUrls.slice(0,3):[]
  };
}



function normalizeReviewTime(v){
  const t=new Date(v||0).getTime();
  return Number.isFinite(t) ? t : 0;
}
function reviewIdentityKey(r){
  const who=(r.createdBy||'').trim();
  return who ? `${r.placeId}|${who}` : `${r.placeId}|legacy|${r.id}`;
}
function dedupeReviews(reviews){
  const map=new Map();
  (reviews||[]).forEach(r=>{
    const key=reviewIdentityKey(r);
    const prev=map.get(key);
    if(!prev || normalizeReviewTime(r.createdAt)>=normalizeReviewTime(prev.createdAt)){
      map.set(key,r);
    }
  });
  return [...map.values()];
}

function normalizePlaceName(name){
  return String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
}
function placeLocationKey(p){
  const lat=Number(p.lat), lng=Number(p.lng);
  return `${normalizePlaceName(p.name)}|${Number.isFinite(lat)?lat.toFixed(5):''}|${Number.isFinite(lng)?lng.toFixed(5):''}`;
}
function dedupeDbData(data){
  const places=[];
  const placeIdMap=new Map();
  const byKey=new Map();

  (data.places||[]).forEach(p=>{
    const key=placeLocationKey(p);
    if(!byKey.has(key)){
      byKey.set(key,p);
      places.push(p);
      placeIdMap.set(p.id,p.id);
    }else{
      const keep=byKey.get(key);
      placeIdMap.set(p.id,keep.id);
      if(!keep.description && p.description) keep.description=p.description;
      if(!keep.benefitText && p.benefitText) keep.benefitText=p.benefitText;
      if(!keep.memberBenefit && p.memberBenefit) keep.memberBenefit=true;
      if((!keep.photoUrls || !keep.photoUrls.length) && Array.isArray(p.photoUrls) && p.photoUrls.length) keep.photoUrls=p.photoUrls.slice(0,5);
      keep.tags=[...new Set([...(keep.tags||[]),...(p.tags||[])])];
      if(keep.initialRating==null && p.initialRating!=null) keep.initialRating=p.initialRating;
    }
  });

  const reviews=dedupeReviews((data.reviews||[]).map(r=>({
    ...r,
    placeId:placeIdMap.get(r.placeId)||r.placeId
  })));

  return {places,reviews};
}

function remotePlaceToLocal(p){
  return {
    id:p.id,
    name:p.name,
    category:p.category,
    subcategory:p.subcategory||'',
    area:p.area||'',
    address:p.address||'',
    lat:Number(p.lat),
    lng:Number(p.lng),
    description:p.description||'',
    initialRating:p.initial_rating==null?null:Number(p.initial_rating),
    memberBenefit:!!p.member_benefit,
    benefitText:p.benefit_text||'',
    photoUrls:Array.isArray(p.photo_urls)?p.photo_urls:[],
    tags:Array.isArray(p.tags)?p.tags:[],
    ownerKeyHash:p.owner_key_hash||'',
    deleteRequested:!!p.delete_requested,
    createdAt:p.created_at||null,
    updatedAt:p.updated_at||null
  };
}

function remoteReviewToLocal(r){
  return {
    id:r.id,
    placeId:r.place_id,
    nickname:r.author_name||'회원',
    rating:r.rating==null?null:Number(r.rating),
    text:r.body||'',
    createdAt:r.created_at,
    createdBy:r.created_by||'',
    photoUrls:Array.isArray(r.photo_urls)?r.photo_urls:[]
  };
}



const memoryStorage=new Map();
const memorySession=new Map();

function safeStorageGet(key){
  try{
    const value=window.localStorage?.getItem(key);
    if(value!==null && value!==undefined){
      memoryStorage.set(key,value);
      return value;
    }
  }catch(err){
    console.warn('localStorage unavailable; memory fallback active',err?.name||err);
  }
  return memoryStorage.has(key)?memoryStorage.get(key):null;
}
function safeStorageSet(key,value){
  const str=String(value);
  memoryStorage.set(key,str);
  try{window.localStorage?.setItem(key,str)}
  catch(err){console.warn('localStorage write unavailable; memory fallback active',err?.name||err)}
}
function safeStorageRemove(key){
  memoryStorage.delete(key);
  try{window.localStorage?.removeItem(key)}catch(err){}
}
function safeSessionGet(key){
  try{
    const value=window.sessionStorage?.getItem(key);
    if(value!==null && value!==undefined){
      memorySession.set(key,value);
      return value;
    }
  }catch(err){
    console.warn('sessionStorage unavailable; memory fallback active',err?.name||err);
  }
  return memorySession.has(key)?memorySession.get(key):null;
}
function safeSessionSet(key,value){
  const str=String(value);
  memorySession.set(key,str);
  try{window.sessionStorage?.setItem(key,str)}catch(err){}
}
function safeSessionRemove(key){
  memorySession.delete(key);
  try{window.sessionStorage?.removeItem(key)}catch(err){}
}

const OWNED_PLACE_IDS_KEY='viettrip_owned_place_ids_v1';
function getOwnedPlaceIds(){
  try{
    return JSON.parse(safeStorageGet(OWNED_PLACE_IDS_KEY)||'[]');
  }catch(err){
    return [];
  }
}
function setOwnedPlaceIds(ids){
  safeStorageSet(OWNED_PLACE_IDS_KEY, JSON.stringify([...new Set((ids||[]).filter(Boolean))]));
}
function rememberOwnedPlace(placeId){
  if(!placeId)return;
  const ids=new Set(getOwnedPlaceIds());
  ids.add(placeId);
  setOwnedPlaceIds([...ids]);
}
function forgetOwnedPlace(placeId){
  const ids=new Set(getOwnedPlaceIds());
  ids.delete(placeId);
  setOwnedPlaceIds([...ids]);
}
function isLocallyOwnedPlace(placeId){
  return getOwnedPlaceIds().includes(placeId);
}

function getDeviceId(){
  const key='viettrip_device_id_v1';
  let id=safeStorageGet(key);
  if(!id){
    id=crypto.randomUUID();
    safeStorageSet(key,id);
  }
  return id;
}

async function sha256Hex(text){
  const bytes=new TextEncoder().encode(String(text||''));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function initDeviceHash(){
  try{
    state.deviceHash=await sha256Hex(getDeviceId());
    (db().places||[]).forEach(p=>{
      if(p && p.ownerKeyHash && state.deviceHash===p.ownerKeyHash){
        rememberOwnedPlace(p.id);
      }
    });
    renderDetail();
  }catch(err){
    console.warn('device hash init failed',err);
  }
}
function isOwnerPlace(p){
  if(!p)return false;

  // 서버 소유자 해시가 있는 업체는 반드시 해시가 일치해야 수정 가능.
  // 로컬 기억값은 owner_key_hash가 없는 예전 데이터에만 보조적으로 사용.
  if(p.ownerKeyHash){
    return !!(state.deviceHash && state.deviceHash===p.ownerKeyHash);
  }

  return isLocallyOwnedPlace(p.id);
}
function adminKey(){
  return safeSessionGet('viettrip_admin_key_v1')||'';
}


async function supaGet(table,query=''){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{
    headers:{...SUPABASE_HEADERS,'Accept':'application/json'}
  });
  if(!res.ok)throw new Error(await res.text());
  return await res.json();
}

async function supaInsert(table,row){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
    method:'POST',
    headers:{...SUPABASE_HEADERS,'Prefer':'return=minimal'},
    body:JSON.stringify(row)
  });
  if(!res.ok){
    const msg=await res.text();
    // 이미 동기화된 동일 ID는 무시
    if(res.status===409 || msg.includes('duplicate key'))return;
    throw new Error(msg);
  }
}

async function supaRpc(fn,args={}){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:'POST',
    headers:{...SUPABASE_HEADERS,'Accept':'application/json'},
    body:JSON.stringify(args)
  });
  if(!res.ok)throw new Error(await res.text());
  const text=await res.text();
  if(!text)return null;
  try{return JSON.parse(text)}catch{return text}
}




function revokePlacePreviewUrls(){
  // 기존 object URL 방식은 더 이상 사용하지 않지만, 이전 상태와 호환을 위해 정리한다.
  (state.placePreviewUrls||[]).forEach(u=>{
    try{URL.revokeObjectURL(u)}catch(err){}
  });
  state.placePreviewUrls=[];
}

function resetPlacePhotoDraftUi(){
  revokePlacePreviewUrls();
  state.placeNewFiles=[];
  state.placeExistingPhotos=[];
  state.placePhotoProcessing=false;
  if($('#pPhotos'))$('#pPhotos').value='';
  if($('#pPhotoPreview'))$('#pPhotoPreview').innerHTML='';
  if($('#pPhotoCount'))$('#pPhotoCount').textContent='';
  updatePlacePhotoSaveState();
}


function setPlaceSaveStatus(text='',ok=false,error=false){
  const el=$('#placeSaveStatus');
  if(!el)return;
  el.textContent=text;
  el.style.color=error?'#dc2626':(ok?'#0b8f52':'#64748b');
}

function setPlaceSaving(on,label='저장 중…'){
  state.placeSaveInProgress=!!on;
  const btn=$('#savePlace');
  if(!btn)return;
  if(on){
    btn.disabled=true;
    btn.dataset.beforeSaveLabel=btn.textContent;
    btn.textContent=label;
  }else{
    btn.disabled=false;
    if(btn.dataset.beforeSaveLabel){
      btn.textContent=btn.dataset.beforeSaveLabel;
      delete btn.dataset.beforeSaveLabel;
    }
  }
}

function applyPlacePatchLocally(place,patch){
  if(!place)return;
  place.name=patch.name;
  place.category=patch.category;
  place.subcategory=patch.subcategory||'';
  place.area=patch.area||'';
  place.address=patch.address||'';
  place.lat=Number(patch.lat);
  place.lng=Number(patch.lng);
  place.description=patch.description||'';
  place.memberBenefit=!!patch.member_benefit;
  place.benefitText=patch.benefit_text||'';
  place.photoUrls=Array.isArray(patch.photo_urls)?[...patch.photo_urls]:[];
  place.tags=Array.isArray(patch.tags)?[...patch.tags]:[];
  place.updatedAt=new Date().toISOString();
}

async function updateExistingPlaceWithFallback(placeId,current,patch){
  if(state.editMode==='admin' || state.isAdmin){
    const key=adminKey();
    if(key){
      try{
        if(await verifyAdminKey(key)){
          const ok=await supaRpc('admin_update_place',{
            p_admin_key:key,
            p_place_id:placeId,
            p_patch:patch
          });
          if(ok===true)return {ok:true,mode:'admin'};
        }
      }catch(err){
        console.warn('admin update failed',err);
      }
    }

    if(isOwnerPlace(current)){
      try{
        const ok=await supaRpc('owner_update_place',{
          p_place_id:placeId,
          p_owner_key:getDeviceId(),
          p_patch:patch
        });
        if(ok===true)return {ok:true,mode:'owner'};
      }catch(err){
        console.warn('owner fallback failed',err);
      }
    }
    return {ok:false,reason:'admin'};
  }

  try{
    const ok=await supaRpc('owner_update_place',{
      p_place_id:placeId,
      p_owner_key:getDeviceId(),
      p_patch:patch
    });
    if(ok===true)return {ok:true,mode:'owner'};
  }catch(err){
    console.warn('owner update failed',err);
  }

  return {ok:false,reason:'owner'};
}

function updatePlacePhotoSaveState(){
  const save=$('#savePlace');
  if(!save)return;

  if(state.placePhotoProcessing){
    save.disabled=true;
    save.dataset.normalLabel=save.dataset.normalLabel||save.textContent;
    save.textContent='사진 처리 중…';
  }else{
    save.disabled=false;
    if(save.dataset.normalLabel){
      save.textContent=save.dataset.normalLabel;
      delete save.dataset.normalLabel;
    }
  }
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('사진 파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

function isHeicLike(file){
  const name=String(file?.name||'').toLowerCase();
  const type=String(file?.type||'').toLowerCase();
  return type.includes('heic') || type.includes('heif') || /\.(heic|heif)$/i.test(name);
}

let heic2AnyPromise=null;
function loadHeic2Any(){
  if(window.heic2any)return Promise.resolve(window.heic2any);
  if(heic2AnyPromise)return heic2AnyPromise;

  heic2AnyPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    s.async=true;
    s.onload=()=>window.heic2any?resolve(window.heic2any):reject(new Error('HEIC 변환기를 불러오지 못했습니다.'));
    s.onerror=()=>reject(new Error('HEIC 변환기를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.'));
    document.head.appendChild(s);
  });

  return heic2AnyPromise;
}

async function normalizePlacePhotoFile(file){
  if(!file)throw new Error('사진 파일이 없습니다.');

  if(isHeicLike(file)){
    const converter=await loadHeic2Any();
    const converted=await converter({
      blob:file,
      toType:'image/jpeg',
      quality:0.88
    });
    const blob=Array.isArray(converted)?converted[0]:converted;
    return new File(
      [blob],
      String(file.name||'photo').replace(/\.(heic|heif)$/i,'.jpg'),
      {type:'image/jpeg',lastModified:Date.now()}
    );
  }

  if(!String(file.type||'').startsWith('image/')){
    throw new Error('이미지 파일만 선택할 수 있습니다.');
  }

  return file;
}

async function canDecodeImageFile(file){
  if('createImageBitmap' in window){
    try{
      const bitmap=await createImageBitmap(file);
      bitmap.close?.();
      return true;
    }catch(err){}
  }

  try{
    const dataUrl=await fileToDataUrl(file);
    await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=resolve;
      img.onerror=()=>reject(new Error('이미지 디코딩 실패'));
      img.src=dataUrl;
    });
    return true;
  }catch(err){
    return false;
  }
}

async function renderPlacePhotoPreview(){
  const box=$('#pPhotoPreview');
  const count=$('#pPhotoCount');
  if(!box)return;

  const existing=(state.placeExistingPhotos||[]).map((url,index)=>({
    src:url,
    kind:'existing',
    index
  }));

  const fresh=[];
  for(let index=0; index<(state.placeNewFiles||[]).length; index++){
    const file=state.placeNewFiles[index];
    try{
      const src=await fileToDataUrl(file);
      fresh.push({src,kind:'new',index});
    }catch(err){
      console.error('preview read failed',err);
      fresh.push({src:'',kind:'new',index,error:true});
    }
  }

  const all=[...existing,...fresh].slice(0,5);

  box.innerHTML=all.map(x=>`
    <div class="placePhotoTile">
      ${x.src
        ? `<img src="${esc(x.src)}" alt="업체 사진 미리보기" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div style="${x.src?'display:none;':'display:flex;'}height:100%;align-items:center;justify-content:center;padding:10px;text-align:center;font-size:11px;color:#b45309;background:#fff7ed">미리보기를 표시할 수 없습니다</div>
      <button type="button" class="placePhotoRemove"
        data-place-photo-kind="${x.kind}"
        data-place-photo-index="${x.index}"
        aria-label="사진 제거">×</button>
    </div>
  `).join('');

  if(count)count.textContent=`${all.length}/5장`;
}

function removePlacePhoto(kind,index){
  const i=Number(index);
  if(!Number.isInteger(i) || i<0)return;

  if(kind==='existing'){
    state.placeExistingPhotos.splice(i,1);
  }else if(kind==='new'){
    state.placeNewFiles.splice(i,1);
  }

  renderPlacePhotoPreview();
}

async function handlePlacePhotoSelection(){
  const input=$('#pPhotos');
  if(!input)return;

  const raw=[...(input.files||[])];
  input.value='';

  if(!raw.length)return;

  const current=(state.placeExistingPhotos||[]).length+(state.placeNewFiles||[]).length;
  const available=Math.max(0,5-current);

  if(!available){
    alert('업체 사진은 최대 5장까지 등록할 수 있습니다.');
    return;
  }

  const selected=raw.slice(0,available);
  if(raw.length>available){
    alert(`업체 사진은 최대 5장입니다. 지금 ${available}장만 추가됩니다.`);
  }

  state.placePhotoProcessing=true;
  updatePlacePhotoSaveState();
  if($('#pPhotoCount'))$('#pPhotoCount').textContent='사진 확인 중…';

  const accepted=[];
  const failed=[];

  try{
    for(const rawFile of selected){
      try{
        const file=await normalizePlacePhotoFile(rawFile);
        const decodable=await canDecodeImageFile(file);
        if(!decodable)throw new Error('브라우저에서 읽을 수 없는 이미지입니다.');
        accepted.push(file);
      }catch(err){
        console.error('photo normalize failed',rawFile?.name,err);
        failed.push(`${rawFile?.name||'사진'}: ${err.message||'처리 실패'}`);
      }
    }

    state.placeNewFiles.push(...accepted);
    await renderPlacePhotoPreview();

    if(failed.length){
      alert(`일부 사진을 추가하지 못했습니다.\n\n${failed.join('\n')}`);
    }
  }finally{
    state.placePhotoProcessing=false;
    updatePlacePhotoSaveState();
  }
}

async function decodeImageForCanvas(file){
  if('createImageBitmap' in window){
    try{
      const bitmap=await createImageBitmap(file);
      return {
        source:bitmap,
        width:bitmap.width,
        height:bitmap.height,
        cleanup:()=>bitmap.close?.()
      };
    }catch(err){
      console.warn('createImageBitmap failed; falling back to Image()',err);
    }
  }

  const dataUrl=await fileToDataUrl(file);
  const img=await new Promise((resolve,reject)=>{
    const el=new Image();
    el.onload=()=>resolve(el);
    el.onerror=()=>reject(new Error('선택한 사진을 브라우저에서 읽지 못했습니다.'));
    el.src=dataUrl;
  });

  return {
    source:img,
    width:img.naturalWidth,
    height:img.naturalHeight,
    cleanup:()=>{}
  };
}

async function compressPlacePhoto(file){
  const decoded=await decodeImageForCanvas(file);
  try{
    const maxSide=1280;
    const scale=Math.min(1,maxSide/Math.max(decoded.width,decoded.height));
    const w=Math.max(1,Math.round(decoded.width*scale));
    const h=Math.max(1,Math.round(decoded.height*scale));

    const canvas=document.createElement('canvas');
    canvas.width=w;
    canvas.height=h;

    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw new Error('사진 압축 기능을 사용할 수 없습니다.');

    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,w,h);
    ctx.drawImage(decoded.source,0,0,w,h);

    let blob=await canvasToBlob(canvas,'image/webp',.76);
    if(blob.size>720000)blob=await canvasToBlob(canvas,'image/webp',.62);
    if(blob.size>850000)blob=await canvasToBlob(canvas,'image/webp',.52);

    if(blob.size>950000){
      throw new Error('사진 용량이 너무 큽니다. 더 작은 사진을 선택해주세요.');
    }

    return blob;
  }finally{
    decoded.cleanup?.();
  }
}

async function uploadPlacePhoto(blob,placeId,index){
  const deviceHash=state.deviceHash || await sha256Hex(getDeviceId());
  const path=`${placeId}/${deviceHash.slice(0,20)}/${Date.now()}-${index}-${crypto.randomUUID().slice(0,8)}.webp`;

  const res=await fetch(
    `${SUPABASE_URL}/storage/v1/object/place-photos/${storagePathUrl(path)}`,
    {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'image/webp',
        'x-upsert':'false'
      },
      body:blob
    }
  );

  if(!res.ok){
    const msg=await res.text();
    throw new Error(`사진 서버 업로드 실패 (${res.status}) ${msg.slice(0,160)}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/place-photos/${storagePathUrl(path)}`;
}

async function uploadSelectedPlacePhotos(placeId){
  if(state.placePhotoProcessing){
    throw new Error('사진 처리 중입니다. 잠시 후 다시 저장해주세요.');
  }

  const urls=[...(state.placeExistingPhotos||[])].slice(0,5);
  const files=(state.placeNewFiles||[]).slice(0,Math.max(0,5-urls.length));

  for(let i=0;i<files.length;i++){
    setDbStatus(`업체 사진 ${i+1}/${files.length} 압축·업로드 중…`);
    const blob=await compressPlacePhoto(files[i]);
    const url=await uploadPlacePhoto(blob,placeId,i);
    urls.push(url);
  }

  return urls.slice(0,5);
}

function revokeReviewPreviewUrls(){
  (state.reviewPreviewUrls||[]).forEach(u=>URL.revokeObjectURL(u));
  state.reviewPreviewUrls=[];
}

function renderReviewPhotoPreview(){
  const box=$('#rPhotoPreview');
  if(!box)return;

  revokeReviewPreviewUrls();

  const existing=(state.reviewExistingPhotos||[]).map(url=>({
    src:url,label:'기존'
  }));
  const fresh=(state.reviewNewFiles||[]).map(file=>{
    const src=URL.createObjectURL(file);
    state.reviewPreviewUrls.push(src);
    return {src,label:'추가'};
  });

  const all=[...existing,...fresh].slice(0,3);
  box.innerHTML=all.map(x=>`
    <div class="reviewPhotoThumb" title="${x.label}">
      <img src="${x.src}" alt="후기 사진 미리보기">
    </div>
  `).join('');
}

function handleReviewPhotoSelection(){
  const input=$('#rPhotos');
  if(!input)return;

  const available=Math.max(0,3-(state.reviewExistingPhotos||[]).length);
  const files=[...(input.files||[])].filter(f=>f.type.startsWith('image/')).slice(0,available);

  if((input.files||[]).length>available){
    alert(`후기 사진은 기존 사진 포함 최대 3장까지 가능합니다. 추가 가능한 사진은 ${available}장입니다.`);
  }

  state.reviewNewFiles=files;
  renderReviewPhotoPreview();
}

function loadImageForCompression(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror=()=>{
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };
    img.src=url;
  });
}

function canvasToBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('사진 압축 실패')),type,quality);
  });
}

async function compressReviewPhoto(file){
  const img=await loadImageForCompression(file);
  const maxSide=1024;
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*scale));
  const h=Math.max(1,Math.round(img.naturalHeight*scale));

  const canvas=document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.drawImage(img,0,0,w,h);

  let blob=await canvasToBlob(canvas,'image/webp',.72);
  if(blob.size>620000) blob=await canvasToBlob(canvas,'image/webp',.58);

  if(blob.size>730000){
    throw new Error('압축 후에도 사진 용량이 너무 큽니다. 다른 사진을 선택해주세요.');
  }
  return blob;
}

function storagePathUrl(path){
  return path.split('/').map(encodeURIComponent).join('/');
}

async function uploadReviewPhoto(blob,placeId,reviewId,index){
  const deviceHash=state.deviceHash || await sha256Hex(getDeviceId());
  const path=`${placeId}/${deviceHash.slice(0,20)}/${reviewId}-${Date.now()}-${index}.webp`;

  const res=await fetch(
    `${SUPABASE_URL}/storage/v1/object/review-photos/${storagePathUrl(path)}`,
    {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'image/webp',
        'x-upsert':'false'
      },
      body:blob
    }
  );

  if(!res.ok)throw new Error(await res.text());

  return `${SUPABASE_URL}/storage/v1/object/public/review-photos/${storagePathUrl(path)}`;
}

async function uploadSelectedReviewPhotos(placeId,reviewId){
  const urls=[...(state.reviewExistingPhotos||[])].slice(0,3);
  const files=(state.reviewNewFiles||[]).slice(0,Math.max(0,3-urls.length));

  for(let i=0;i<files.length;i++){
    setDbStatus(`사진 ${i+1}/${files.length} 압축·업로드 중…`);
    const blob=await compressReviewPhoto(files[i]);
    const url=await uploadReviewPhoto(blob,placeId,reviewId,i);
    urls.push(url);
  }
  return urls.slice(0,3);
}




async function supaPatch(table,query,row){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{
    method:'PATCH',
    headers:{...SUPABASE_HEADERS,'Prefer':'return=minimal'},
    body:JSON.stringify(row)
  });
  if(!res.ok)throw new Error(await res.text());
}


async function fetchSharedDb(){
  // 업체와 후기 로딩을 분리한다.
  // 후기 API가 일시적으로 실패해도 업체 목록/지도 마커는 반드시 표시한다.
  let places=[];
  let reviews=[];
  let placeError=null;

  try{
    places=await supaGet('places_public','select=*&order=created_at.asc');
  }catch(err){
    placeError=err;
    console.warn('places_public load failed; trying public places fallback',err);
    try{
      places=await supaGet(
        'places',
        'select=id,name,category,subcategory,area,address,lat,lng,description,initial_rating,member_benefit,benefit_text,photo_urls,tags,created_at,updated_at&order=created_at.asc'
      );
      placeError=null;
    }catch(fallbackErr){
      console.error('places fallback load failed',fallbackErr);
      placeError=fallbackErr;
    }
  }

  if(placeError)throw placeError;

  try{
    reviews=await supaGet('reviews','select=*&order=created_at.asc');
  }catch(err){
    console.warn('reviews load failed; businesses will still be shown',err);
    reviews=[];
  }

  return dedupeDbData({
    places:(places||[]).map(remotePlaceToLocal),
    reviews:(reviews||[]).map(remoteReviewToLocal)
  });
}

async function uploadMissingLocal(local,remote){
  local=dedupeDbData(local);
  remote=dedupeDbData(remote);

  const remoteByKey=new Map(remote.places.map(p=>[placeLocationKey(p),p]));
  const remoteReviewIds=new Set(remote.reviews.map(r=>r.id));
  const remoteReviewByIdentity=new Map(
    remote.reviews
      .filter(r=>r.createdBy)
      .map(r=>[reviewIdentityKey(r),r])
  );
  const localToRemoteId=new Map();

  for(const p of local.places){
    const key=placeLocationKey(p);
    const existing=remoteByKey.get(key);
    if(existing){
      localToRemoteId.set(p.id,existing.id);
      continue;
    }
    try{
      await supaInsert('places',placeToRemote(p));
      remoteByKey.set(key,p);
      localToRemoteId.set(p.id,p.id);
    }catch(err){
      console.warn('duplicate place prevented',err);
    }
  }

  const refreshed=await fetchSharedDb();
  const refreshedByKey=new Map(refreshed.places.map(p=>[placeLocationKey(p),p]));
  local.places.forEach(p=>{
    const ex=refreshedByKey.get(placeLocationKey(p));
    if(ex)localToRemoteId.set(p.id,ex.id);
  });

  for(const r of dedupeReviews(local.reviews)){
    const remotePlaceId=localToRemoteId.get(r.placeId)||r.placeId;
    const normalized={...r, placeId:remotePlaceId};

    if(remoteReviewIds.has(normalized.id)) continue;

    const existingByDevice = normalized.createdBy ? remoteReviewByIdentity.get(reviewIdentityKey(normalized)) : null;
    if(existingByDevice){
      await supaPatch(
        'reviews',
        `id=eq.${existingByDevice.id}`,
        {
          rating:normalized.rating==null?null:Number(normalized.rating),
          body:normalized.text||null,
          author_name:normalized.nickname||null,
          created_at:normalized.createdAt||new Date().toISOString()
        }
      );
      continue;
    }

    await supaInsert('reviews',reviewToRemote(normalized));
  }
}

async function syncSharedDb(){
  try{
    setDbStatus('공용 DB 동기화 중…');
    const local=dedupeDbData(db());
    const remote=await fetchSharedDb();

    // 기존 브라우저 저장 데이터는 1회 자동 업로드
    await uploadMissingLocal(local,remote);

    // 다시 받아 전체 회원 데이터를 로컬 캐시에 저장
    const merged=await fetchSharedDb();
    saveDb(merged);
    renderAll();
    renderHierarchyNav();
    setDbStatus(`공용 DB · 업체 ${merged.places.length}개 · 후기 ${merged.reviews.length}개`,true);
  }catch(err){
    console.error('Supabase sync failed',err);
    setDbStatus('공용 DB 연결 오류 · 로컬 임시저장');
  }
}


let sharedBootstrapPromise=null;

async function bootstrapSharedDb({force=false}={}){
  if(sharedBootstrapPromise && !force)return sharedBootstrapPromise;

  sharedBootstrapPromise=(async ()=>{
    state.sharedDbLoading=true;
    if(typeof renderList==='function')renderList();
    setDbStatus('공용 업체 불러오는 중…');

    const local=dedupeDbData(db());
    let remote=null;
    let lastErr=null;

    // 모바일 네트워크가 순간적으로 늦어도 바로 0개로 확정하지 않도록 재시도.
    for(let attempt=0;attempt<3;attempt++){
      try{
        remote=await fetchSharedDb();
        break;
      }catch(err){
        lastErr=err;
        console.warn(`shared DB bootstrap attempt ${attempt+1} failed`,err);
        if(attempt<2)await new Promise(r=>setTimeout(r,700*(attempt+1)));
      }
    }

    if(!remote)throw lastErr||new Error('공용 DB를 불러오지 못했습니다.');

    // 서버 데이터는 즉시 보이고, 이 기기에 남아 있던 미동기화 로컬 데이터도 잃지 않는다.
    const mergedImmediate=dedupeDbData({
      places:[...remote.places,...local.places],
      reviews:[...remote.reviews,...local.reviews]
    });

    saveDb(mergedImmediate);
    state.sharedDbLoading=false;

    renderAll();
    renderHierarchyNav();
    syncMobileListCount();
    setDbStatus(`공용 DB · 업체 ${remote.places.length}개 · 후기 ${remote.reviews.length}개`,true);

    // 과거 브라우저에만 남아 있는 데이터가 있을 때만 서버 이전 작업.
    const remotePlaceKeys=new Set(remote.places.map(placeLocationKey));
    const remoteReviewIds=new Set(remote.reviews.map(r=>r.id));
    const hasMissingLocal=
      local.places.some(p=>!remotePlaceKeys.has(placeLocationKey(p))) ||
      local.reviews.some(r=>!remoteReviewIds.has(r.id));

    if(hasMissingLocal){
      try{
        await uploadMissingLocal(local,remote);
        const finalDb=await fetchSharedDb();
        saveDb(finalDb);
        renderAll();
        renderHierarchyNav();
        syncMobileListCount();
        setDbStatus(`공용 DB · 업체 ${finalDb.places.length}개 · 후기 ${finalDb.reviews.length}개`,true);
      }catch(err){
        console.warn('legacy local migration failed; shared data remains visible',err);
      }
    }

    return remote;
  })().catch(err=>{
    state.sharedDbLoading=false;
    console.error('shared DB bootstrap failed',err);
    renderList();
    setDbStatus('공용 DB 연결 오류 · 다시 접속하거나 화면을 새로고침해주세요.');
    throw err;
  }).finally(()=>{
    sharedBootstrapPromise=null;
  });

  return sharedBootstrapPromise;
}


let state={sharedDbLoading:true,city:'hcmc',navCategory:null,areaType:'all',cat:'all',sub:'all',query:'',sort:'newest',ratingFilter:'all',benefitFilter:'all',restaurantTag:'all',selectedNavItem:null,selected:null,rating:5,newPlaceRating:5,reviewNewFiles:[],reviewExistingPhotos:[],reviewPreviewUrls:[],placeNewFiles:[],placeExistingPhotos:[],placePreviewUrls:[],placePhotoProcessing:false,placeSaveInProgress:false,editPlaceId:null,editMode:null,deviceHash:null,isAdmin:false,map:null,markers:[],premiumCircles:[],premiumPulseTimer:null,golfMarkers:[],poiMarkers:[],areaOverlays:[],selectionOverlays:[],rangeSelectionKey:null,rangeMoveIdleListener:null,rangeMoveAnimationToken:0,areaLabels:[],clickLatLng:null,registerMode:false,hoverInfo:null,clickInfo:null,addressAutocomplete:null,searchMarker:null,searchCandidate:null,addressSearchMarker:null,userMarker:null,userAccuracyCircle:null,userInfo:null,locationWatch:null};
const $=s=>document.querySelector(s);
function db(){
  try{
    const raw=JSON.parse(safeStorageGet(DBKEY)||'{"places":[],"reviews":[]}');
    return typeof dedupeDbData==='function' ? dedupeDbData(raw) : raw;
  }catch(err){
    console.warn('DB cache read failed',err);
    return {places:[],reviews:[]};
  }
}
function saveDb(x){
  const json=JSON.stringify(x);
  const current=safeStorageGet(DBKEY);
  if(current)safeStorageSet(DBKEY+'_backup',current);
  safeStorageSet(DBKEY,json);
  return true;
}

function categoryIcon(category,subcategory=''){
  const sub=String(subcategory||'');
  if(category==='stay'){
    if(sub.includes('호텔')) return '🏨';
    if(sub.includes('아파트')) return '🏢';
    if(sub.includes('레지던스')) return '🏠';
    return '🛏️';
  }
  if(category==='restaurant') return '🍽️';
  if(category==='spa') return '💆';
  if(category==='karaoke') return '🎤';
  if(category==='cafe') return '☕';
  if(category==='shopping'){
    if(sub.includes('마트')) return '🛒';
    if(sub.includes('백화점')) return '🏬';
    if(sub.includes('아울렛')) return '🏷️';
    return '🛍️';
  }
  if(category==='market') return '🛍️';
  if(category==='attraction') return '📍';
  if(category==='bar') return '🍸';
  if(category==='golf') return '⛳';
  return '📌';
}
