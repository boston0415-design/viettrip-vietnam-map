/* Search aliases only: never used to merge identities, addresses or reviews. */
(() => {
  'use strict';
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').trim();
  const groups=[
    ['ho chi minh','호치민','hochiminh','hcmc'],['saigon','사이공','사이곤','sai gon'],['ha noi','하노이','hanoi'],['da lat','달랏','달라트','dalat'],['da nang','다낭','danang'],['nha trang','나트랑','냐짱'],['phu quoc','푸꾸옥','푸꿕'],['phu my hung','푸미흥'],['thao dien','타오디엔'],['my dinh','미딩'],['hoan kiem','호안끼엠'],['tay ho','서호','떠이호'],['bui vien','부이비엔'],['le thanh ton','레탄톤'],['tran hung dao','쩐흥다오','쫀흥다오','트란흥다오'],
    ['onsi','온시'],['weekend','위켄드','위크엔드'],['nj','엔제이','엔제이'],['head spa','헤드스파','헤드 스파'],['spa','스파'],['massage','마사지'],['barber','바버','바버샵'],['saigon square','사이공스퀘어','사이공 스퀘어'],['pho thin','포틴','퍼틴'],['bun moc','분목','분목'],['thanh mai','탄마이','타인마이'],['uraetei','우라에테이','우라에테'],['samwon','삼원'],['hang nima','행님아','hangnima'],['pizza','피자'],['coffee','커피'],['cafe','카페'],['hotel','호텔'],['bar','바'],['bbq','비비큐'],['sushi','스시'],['sashimi','사시미'],['bakery','베이커리'],['restaurant','레스토랑'],['starbucks','스타벅스'],['highlands','하이랜드','하이랜즈'],['cong','콩'],['phuc long','푹롱','푹롱'],['katinat','카티낫'],['vincom','빈컴'],['lotte','롯데'],['vinmart','빈마트'],['iphone','아이폰'],['samsung','삼성'],['apple','애플'],['vietnam','베트남'],['korean','코리안'],['japanese','재패니즈'],['french','프렌치'],['grill','그릴'],['garden','가든'],['rooftop','루프탑'],['lounge','라운지'],['royal','로얄','로열'],['palace','팰리스','팔레스'],['market','마켓']
  ];
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const aliases=groups.flatMap(([word,...others])=>[word,...others].map(alias=>({word,alias:normalize(alias)}))).sort((a,b)=>b.alias.length-a.alias.length);
  // Match each original segment once. Replacement words must not be replaced
  // again (e.g. Saigon Square must stay one alias, and bar is not part of barber).
  const pattern=new RegExp(aliases.map(({alias})=>/[a-z]/.test(alias)?'(?<![a-z])'+escape(alias).replace(/ /g,'\\s*')+'(?![a-z])':escape(alias).replace(/ /g,'\\s*')).join('|'),'gi');
  function canonical(s){return normalize(s).replace(pattern,m=>aliases.find(a=>a.alias.replace(/ /g,'')===m.replace(/ /g,''))?.word||m).replace(/\s+/g,' ').trim();}
  const initials=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const vowels=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  const endings=['','k','k','ks','n','nj','nh','t','l','lk','lm','lp','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
  function phonetic(s){return canonical(s).replace(/[가-힣]/g,c=>{const n=c.charCodeAt(0)-44032;return initials[Math.floor(n/588)]+vowels[Math.floor(n%588/28)]+endings[n%28];}).replace(/ph/g,'f').replace(/th/g,'t').replace(/kh/g,'k').replace(/ae|eo|eu/g,'e').replace(/r/g,'l').replace(/[^a-z0-9]/g,'');}
  function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+Number(a[i-1]!==b[j-1]));row=next;}return row[b.length];}
  function score(name,query,details=''){
    const raw=normalize(query),n=normalize(name);if(!raw)return -1;
    if(n===raw)return 0;if(n.startsWith(raw))return 1;if(n.includes(raw))return 2;
    const q=canonical(query),hay=canonical(name+' '+details),cn=canonical(name),compact=q.replace(/ /g,'');
    if(cn.replace(/ /g,'')===compact)return 3;
    if(q.split(' ').every(t=>/^[a-z]{1,3}$/.test(t)?new RegExp('(?:^|[^a-z])'+escape(t)+'(?:[^a-z]|$)').test(hay):hay.includes(t))||(compact.length>=4&&cn.replace(/ /g,'').includes(compact)))return 4;
    // Conservative phonetic suggestions only across scripts. Never select or
    // deduplicate a business automatically based on these approximate matches.
    if(/[가-힣]/.test(query)!==/[가-힣]/.test(name)&&!details.includes(query)){
      const a=phonetic(name),b=phonetic(query),limit=b.length>=11?2:1;
      if(b.length>=6&&a.length<=80&&Math.abs(a.length-b.length)<=limit&&(a.match(/\d/g)||[]).join('')===(b.match(/\d/g)||[]).join('')&&distance(a,b)<=limit)return 6;
    }
    return -1;
  }
  window.NameSearch={normalize,canonical,score,matches:(name,q,details='')=>score(name,q,details)>=0,googleQuery:canonical};
})();
