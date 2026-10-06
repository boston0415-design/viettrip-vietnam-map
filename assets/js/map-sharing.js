/* Kakao JavaScript key is public and domain-restricted, never an Admin key. */
(()=>{
 'use strict';
 const origin='https://viettrip-vietnam-map.pages.dev';
 const key=document.querySelector('meta[name="kakao-javascript-key"]')?.content.trim();
 let ready=false;
 if(key){const sdk=document.createElement('script');sdk.src='https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';sdk.onload=()=>{try{if(!window.Kakao.isInitialized())window.Kakao.init(key);ready=true;document.dispatchEvent(new Event('map-sharing-ready'));}catch{}};document.head.append(sdk);}
 function payload(place){const url=new URL('/',origin);if(place?.id&&/^[a-zA-Z0-9_-]{1,160}$/.test(place.id))url.searchParams.set('place',place.id);return {title:place?.name||'일상탈출 베트남맵',text:place?[place.name,place.address,'베트남맵에서 위치·후기 보기'].filter(Boolean).join('\n'):'베트남 맛집·숙소·회원 후기와 공항 승차장까지',url:url.href};}
 async function share(place,{kakao=false}={}){const data=payload(place);
  if(kakao){if(!ready)return false;try{window.Kakao.Share.sendDefault({objectType:'feed',content:{title:data.title,description:data.text,imageUrl:origin+'/assets/icons/vietmap-192.png',link:{mobileWebUrl:data.url,webUrl:data.url}},buttons:[{title:place?'업소 위치 보기':'베트남맵 열기',link:{mobileWebUrl:data.url,webUrl:data.url}}]});return true;}catch{return false;}}
  if(!navigator.share)return false;try{await navigator.share({title:data.title,url:data.url});return true;}catch(error){return error.name==='AbortError';}
 }
 window.MapSharing={payload,share,get kakaoReady(){return ready}};
})();
