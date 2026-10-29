/* Kakao JavaScript key is public and domain-restricted, never an Admin key. */
(()=>{
 'use strict';
 const origin='https://viettrip-vietnam-map.pages.dev';
 const key=document.querySelector('meta[name="kakao-javascript-key"]')?.content.trim();
 let ready=false,kakaoState=key?'loading':'unconfigured';
 function changed(){document.dispatchEvent(new Event('map-sharing-change'));}
 if(key){
  const sdk=document.createElement('script');
  sdk.src='https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
  sdk.async=true;
  const timeout=setTimeout(()=>{if(!ready){kakaoState='error';changed();}},8000);
  sdk.onload=()=>{
   clearTimeout(timeout);
   try{
    if(!window.Kakao.isInitialized())window.Kakao.init(key);
    ready=Boolean(window.Kakao.isInitialized()&&window.Kakao.Share?.sendDefault);
   }catch{ready=false;}
   kakaoState=ready?'ready':'error';changed();
   if(ready)document.dispatchEvent(new Event('map-sharing-ready'));
  };
  sdk.onerror=()=>{clearTimeout(timeout);kakaoState='error';changed();};
  document.head.append(sdk);
 }
 function payload(place){const url=new URL('/',origin);if(place?.id&&/^[a-zA-Z0-9_-]{1,160}$/.test(place.id))url.pathname='/share/place/'+encodeURIComponent(place.id);return {title:place?.name||'일상탈출 베트남맵',text:place?[place.name,place.address].filter(Boolean).join('\n'):'베트남 맛집·숙소·회원 후기와 공항 승차장까지',url:url.href};}
 function nativeAvailable(place){
  if(typeof navigator.share!=='function')return false;
  try{return typeof navigator.canShare!=='function'||navigator.canShare(payload(place));}catch{return false;}
 }
 function helpText(place){
  if(ready)return '카카오톡으로 공유하거나 내용을 복사해 보내세요.';
  if(nativeAvailable(place))return '공유 앱 선택에서 카카오톡을 선택하세요. 목록에 없으면 내용을 복사해 대화방에 붙여넣어 주세요.';
  if(kakaoState==='loading')return '카카오톡 공유를 연결하고 있습니다. 기다리지 않고 내용을 복사할 수도 있어요.';
  if(kakaoState==='error')return '카카오톡 공유를 연결하지 못했습니다. 내용을 복사해 대화방에 붙여넣어 주세요.';
  return '카카오톡 직접 공유는 아직 연결되지 않았습니다. 내용을 복사해 카카오톡 대화방에 붙여넣어 주세요.';
 }
 async function share(place,{kakao=false}={}){const data=payload(place);
  if(kakao){if(!ready)return false;try{if(place&&!place.photoUrls?.some(value=>{try{return new URL(value).protocol==='https:'}catch{return false}})){window.Kakao.Share.sendDefault({objectType:'text',text:data.text,link:{mobileWebUrl:data.url,webUrl:data.url},buttonTitle:'길찾기'});return true;}window.Kakao.Share.sendDefault({objectType:'feed',content:{title:data.title,description:data.text,imageUrl:place?.photoUrls?.find(value=>{try{return new URL(value).protocol==='https:'}catch{return false}})||origin+'/assets/icons/vietmap-192.png',link:{mobileWebUrl:data.url,webUrl:data.url}},buttons:[{title:place?'업소 위치 보기':'베트남맵 열기',link:{mobileWebUrl:data.url,webUrl:data.url}}]});return true;}catch{return false;}}
  if(!nativeAvailable(place))return false;try{await navigator.share(data);return true;}catch(error){return error?.name==='AbortError';}
 }
 window.MapSharing={payload,share,nativeAvailable,helpText,get kakaoReady(){return ready},get kakaoState(){return kakaoState}};
})();
