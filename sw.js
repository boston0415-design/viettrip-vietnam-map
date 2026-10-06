// Network-only documents: never persist map data, reviews, forms or API responses.
// The worker supplies a clear connection screen only if document navigation fails.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(`<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#247f78"><title>베트남맵 · 연결 확인</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f9f6;color:#244a4c;font-family:system-ui,sans-serif}main{max-width:330px;padding:30px;text-align:center}svg{width:56px;height:56px;color:#247f78}h1{font-size:22px}p{font-size:14px;line-height:1.7;color:#657b72}a{display:inline-block;margin-top:16px;padding:13px 24px;border-radius:12px;background:#247f78;color:white;text-decoration:none}</style>
<main><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><h1>인터넷 연결을 확인해 주세요</h1><p>베트남맵은 인터넷에 연결해<br>지도와 회원의 최신 정보를 불러옵니다.<br>Wi-Fi 또는 모바일 데이터를 켜고 다시 열어주세요.</p><a href="/">지도 다시 열기</a></main></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});

self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 const id=/^[0-9a-f-]{36}$/i.test(data.messageId||'')?data.messageId:null;
 const count=Number.isSafeInteger(data.count)&&data.count>0?data.count:1;
 await self.registration.showNotification('베트남맵 · 새 답장',{body:String(data.body||'내 글에 새 답장이 도착했습니다.').slice(0,120),icon:'/assets/icons/vietmap-192.png',badge:'/assets/icons/vietmap-192.png',tag:id?'reply-'+id:'viettrip-reply',data:{messageId:id,url:id?'/?chat_reply='+id:'/'}});
 if(self.navigator.setAppBadge)await self.navigator.setAppBadge(count).catch(()=>{});
 for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type:'chat-push-received'});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 const id=event.notification.data?.messageId;const url=new URL(id?'/?chat_reply='+id:'/',self.location.origin).href;
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.focus();client.postMessage({type:'chat-push-open',messageId:id});return}}await self.clients.openWindow(url);
})())});
