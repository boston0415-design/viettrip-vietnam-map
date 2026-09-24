// Read-only manufacturer lookup. Never accept a URL/host from a user or model.
// Price and stock are intentionally not inferred from store ratings or mentions.
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function appleProduct(name){
  const text=String(name||'').toLowerCase().replace(/아이폰/g,'iphone').replace(/듀오/g,'duo').replace(/에어/g,'air').replace(/프로/g,'pro').replace(/맥스/g,'max').replace(/플러스/g,'plus').replace(/기가/g,'gb').replace(/테라/g,'tb').replace(/\s+/g,' ').trim();
  const match=text.match(/^iphone\s*(duo|air|se|\d{1,2}e?)(?:\s*(pro)(?:\s*(max))?|\s*(plus))?(?:\s*(\d{2,4})\s*(gb|tb))?$/i);
  if(!match)return null;
  const slug='iphone-'+match[1]+(match[2]?'-pro':match[4]?'-plus':'');
  return {name:text.replace(/^iphone/,'iPhone'),slug,url:'https://www.apple.com/vn/'+slug+'/'};
}
function plain(html){return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|\u00a0/g,' ').replace(/\s+/g,' ').trim();}
export function releaseFrom(html,product){
  const text=plain(html),name=product.name.replace(/\s+\d{2,4}\s*(?:gb|tb)$/i,'');
  // Bind the date to a named product sentence; footer/cross-sell dates do not count.
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const m=text.match(new RegExp(escaped+'[^!?]{0,220}?có hàng[^!?]{0,220}?ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})\\s+năm\\s+(20\\d{2})','i'));
  if(!m)return null;
  const iso=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  const parsed=new Date(iso+'T00:00:00+07:00');
  if(!Number.isFinite(+parsed)||+m[1]>31||+m[2]>12)return null;
  return iso;
}
export async function lookupProduct(name,{fetcher=fetch,now=new Date()}={}){
  const product=appleProduct(name);
  if(!product)return {status:'unverified',name,checkedAt:now.toISOString()};
  const base={name:product.name,source:product.url,sourceLabel:'Apple 베트남',checkedAt:now.toISOString()};
  try{
    const response=await fetcher(product.url,{redirect:'error',signal:AbortSignal.timeout(6500),headers:{Accept:'text/html'}});
    if(!response.ok)throw Error('source unavailable');
    if(Number(response.headers.get('content-length'))>3000000)throw Error('source too large');
    const reader=response.body.getReader(),decoder=new TextDecoder();let html='',size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error('source too large');}html+=decoder.decode(value,{stream:true});}
    html+=decoder.decode();
    const title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
    if(!title.toLowerCase().includes(product.slug.replaceAll('-',' ')))throw Error('different product');
    const releaseDate=releaseFrom(html,product);
    return {...base,status:releaseDate&&+new Date(releaseDate+'T00:00:00+07:00')>+now?'upcoming':'price_unverified',...(releaseDate?{releaseDate}:{}),fresh:true};
  }catch{
    // Reviewed official announcement; expires instead of becoming a permanent
    // hard-coded answer. A source outage is NEVER represented as a live check.
    if(product.slug==='iphone-duo'&&+now>=+new Date('2026-09-24T00:00:00Z')&&+now<+new Date('2026-10-01T00:00:00Z'))return {...base,status:'upcoming',releaseDate:'2026-10-23',preorderDate:'2026-10-16',fresh:false,checkedAt:'2026-09-24T00:00:00Z'};
    return {...base,status:'unverified',fresh:false};
  }
}
export async function onRequest({request}){
  if(request.method!=='POST')return json({error:'POST only'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'지도에서 다시 시도해 주세요.'},403);
  if(!request.headers.get('content-type')?.includes('application/json')||Number(request.headers.get('content-length'))>1024)return json({error:'잘못된 요청'},400);
  let body;try{const text=await request.text();if(text.length>1024)throw Error();body=JSON.parse(text);}catch{return json({error:'잘못된 요청'},400);}
  if(typeof body?.name!=='string'||body.name.length<2||body.name.length>100)return json({error:'제품명을 확인해 주세요.'},400);
  return json(await lookupProduct(body.name));
}
