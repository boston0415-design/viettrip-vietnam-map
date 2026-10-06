/* Web Push is opt-in on each device. Never ask permission automatically. */
(()=>{
 const button=document.getElementById('chatBadgePermission');if(!button)return;
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 let subscription=null,busy=false;const pending=new Set();let timer;
 const api=async(action,body={})=>{const r=await fetch(SUPABASE_URL+'/functions/v1/chat-push/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_HEADERS.apikey},body:JSON.stringify({deviceId:getDeviceId(),...body})});const data=await r.json();if(!r.ok)throw Error(data.error||'알림 연결 실패');return data};
 const paint=()=>{button.hidden=false;button.textContent=subscription?'답장 알림 켜짐 · 끄기':'답장 알림 켜기';button.disabled=busy};
 const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
 async function sync(){if(!subscription)return;const state=await api('state');await window.ChatDock?.syncPush(state.ids);}
 async function read(){if(!subscription||!pending.size)return;const ids=[...pending];try{const state=await api('read',{ids});ids.forEach(id=>pending.delete(id));const reg=await navigator.serviceWorker.getRegistration('/');for(const notification of await reg?.getNotifications()||[])if(ids.includes(notification.data?.messageId))notification.close();if(state.count>0&&navigator.setAppBadge)await navigator.setAppBadge(state.count);else if(!state.count&&navigator.clearAppBadge)await navigator.clearAppBadge()}catch{timer=setTimeout(read,15000)}}
 window.ChatPush={read(id){pending.add(id);clearTimeout(timer);timer=setTimeout(read,250)},sync};
 if(!supported){button.hidden=false;button.textContent='휴대폰 알림 안내';button.onclick=()=>{window.ChatComfort?.feedback('아이폰은 홈 화면에 추가한 앱에서, 안드로이드는 Chrome 등 지원 브라우저에서 알림을 켜 주세요.')};return;}
 button.onclick=async()=>{if(busy)return;busy=true;paint();try{
 if(subscription){await api('unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;if(navigator.clearAppBadge)await navigator.clearAppBadge();}
 else{if(Notification.permission==='denied')throw Error('휴대폰 설정에서 베트남맵 알림을 허용해 주세요.');const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('알림 허용을 선택해야 답장을 받을 수 있습니다.');await window.MapMembership?.refresh();await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});const registration=await navigator.serviceWorker.ready;const response=await fetch(SUPABASE_URL+'/functions/v1/chat-push/config',{headers:{apikey:SUPABASE_HEADERS.apikey}});const config=await response.json();if(!response.ok||!config.publicKey)throw Error('푸시 서버에 연결하지 못했습니다.');const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});await api('subscribe',{subscription:sub.toJSON()});subscription=sub;await sync();}
 }catch(error){window.ChatComfort?.feedback(error.message)}finally{busy=false;paint()}};
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='chat-push-open')window.ChatDock?.openReply(event.data.messageId);else if(event.data?.type==='chat-push-received')sync().catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync().catch(()=>{});read()}});
 window.addEventListener('online',()=>{sync().catch(()=>{});read()});
 paint();navigator.serviceWorker.getRegistration('/').then(async reg=>{subscription=await reg?.pushManager.getSubscription()||null;if(subscription){await window.MapMembership?.refresh();await api('subscribe',{subscription:subscription.toJSON()});await sync();}paint();}).catch(()=>{subscription=null;paint()});
})();
