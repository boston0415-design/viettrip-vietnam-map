// Public metadata only: no admin credentials or writes.
const origin='https://viettrip-vietnam-map.pages.dev';
const endpoint='https://oopxtadfimshydsskcyq.supabase.co';
const anon="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcHh0YWRmaW1zaHlkc3NrY3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjcyMDYsImV4cCI6MjEwNTE0MzIwNn0.iPS9NPtWvxV6NSe1uL4vTb-76EC-FGdS_jyUU4IRuzo";
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function photo(place){
 return (place.photo_urls||[]).find(value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})||origin+'/assets/icons/vietmap-192.png';
}
export async function onRequest({request,params}){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const id=String(params.id||'');
 if(!/^[a-zA-Z0-9_-]{1,160}$/.test(id))return new Response('Invalid place',{status:400});
 let place;
 try{
  const response=await fetch(endpoint+'/rest/v1/places_public?select=id,name,address,photo_urls&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:{apikey:anon,Authorization:'Bearer '+anon},signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('lookup');
  [place]=await response.json();
 }catch{return new Response('잠시 후 다시 열어 주세요.',{status:503,headers:{'Cache-Control':'no-store'}});}
 if(!place)return new Response('등록된 장소를 찾을 수 없습니다.',{status:404});
 const title=escape(place.name),address=escape(place.address),image=escape(photo(place));
 const url=origin+'/share/place/'+encodeURIComponent(id),map=origin+'/?place='+encodeURIComponent(id)+'&navigate=1';
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · 베트남맵</title><meta http-equiv="refresh" content="0;url=${escape(map)}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="일상탈출 베트남맵"><meta property="og:title" content="${title}"><meta property="og:description" content="${address}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="${title}"><meta property="og:url" content="${url}"><meta name="description" content="${address}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${address}"><meta name="twitter:image" content="${image}"><style>body{margin:0;background:#f6f7fa;color:#202638;font:17px/1.6 system-ui,sans-serif}main{max-width:540px;margin:40px auto;padding:20px}img{width:100%;max-height:340px;object-fit:cover;border-radius:20px}h1{font-size:26px;margin:20px 0 8px}p{margin:0 0 24px;overflow-wrap:anywhere}a{display:block;padding:14px;background:#6554d7;color:white;border-radius:14px;text-align:center;text-decoration:none}@media(max-width:600px){main{margin:0 auto}}</style></head><body><main><a href="${escape(map)}">길찾기 열기</a></main></body></html>`;
 return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
}
