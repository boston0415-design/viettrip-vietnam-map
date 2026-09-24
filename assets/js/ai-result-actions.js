(() => {
  'use strict';
  const GRAB='https://food.grab.com/vn/en/';
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').toLowerCase().replace(/đ/g,'d');
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  function link(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function grabUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='food.grab.com'&&!u.username&&!u.password&&/^\/vn\/(?:en|vi)\/restaurant\/[^/]+\/[^/]+\/?$/.test(u.pathname)?u.href:'';}catch{return '';}}
  // Links published by the restaurant itself. Match the branch, not just brand.
  function merchantFor(row){
    const direct=grabUrl(row.websiteURI);if(direct)return {url:direct,source:'Google에 등록된 주문 링크'};
    const p=row.place||row,name=normalize(p.name),address=normalize(p.address);
    if(/burger\s*bro|버거\s*브로/.test(name)&&/da nang|다낭/.test(address)){
      const source='https://burgerbros.amebaownd.com/pages/303765/page_201601301003';
      if(/\b30\s+an\s+thuong\s+4\b/.test(address))return {url:'https://food.grab.com/vn/vi/restaurant/burger-bro%E2%80%99s-at4-beach-side-delivery/5-C7W1L66XDBDVKE',source};
      if(/\b4\s+nguyen\s+chi\s+thanh\b/.test(address))return {url:'https://food.grab.com/vn/en/restaurant/burger-bro-s-delivery/5-C3KAT6NGWA4YRE',source};
    }
    return null;
  }
  function appendDelivery(li,row,intent){
    if(intent.action!=='grabfood')return;
    const p=row.place||row,merchant=merchantFor(row),box=el('div','', 'aiActionBox'),actions=el('div','', 'aiActionButtons');
    if(merchant){actions.append(link('GrabFood에서 이 지점 열기 ↗',merchant.url));}
    else{
      const copy=el('button','업소명 복사','aiActionCopy');copy.type='button';
      const open=link('GrabFood 열기 ↗',GRAB);
      const feedback=el('span','이 지점의 주문 링크는 아직 확인되지 않았어요. 업소명을 복사해 GrabFood에 붙여넣으세요.','aiActionHint');feedback.setAttribute('role','status');
      const copyName=async()=>{try{await navigator.clipboard.writeText(p.name);feedback.textContent='업소명 복사됨 · GrabFood에서 배달 주소를 정하고 붙여넣으세요.';copy.textContent='복사됨';}catch{feedback.textContent='복사하지 못했어요. 아래 업소명을 길게 눌러 복사해 주세요: '+p.name;}};
      copy.addEventListener('click',copyName);
      // Start the copy within the same user gesture; navigation remains a real
      // link, so browsers cannot block an async window.open or lose the target.
      open.addEventListener('click',()=>{void copyName();});
      actions.append(open,copy);box.append(actions,feedback);li.append(box);return;
    }
    box.append(actions,el('span','배달 주소·영업·배달비·최종 금액은 GrabFood에서 확인해 주세요.','aiActionHint'));
    if(merchant.source.startsWith('https:'))box.append(link('업소의 배달 안내 · 2026-09-24 확인',merchant.source));
    li.append(box);
  }
  function deliveryIntro(list,intent){
    if(intent.action!=='grabfood')return;
    const box=el('li','', 'aiActionIntro');
    box.append(el('strong','맛집 선택 → GrabFood에서 주문'),el('p','아래 업소의 GrabFood 버튼을 눌러 주세요. 배달받을 주소를 먼저 정해야 실제 주문 가능 여부와 배달비를 확인할 수 있어요.'));
    list.append(box);
  }
  let productWork=null;
  function cancel(){productWork?.abort();productWork=null;}
  function renderProduct(list,intent){
    if(!intent.productSearch)return null;
    cancel();const work=new AbortController();productWork=work;
    const card=el('li','', 'aiProductAnswer aiTravelAnswer'),name=intent.productName||'';
    const heading=el('h3',name||'정확한 제품을 먼저 확인할게요');
    const message=el('p',name?'제조사 공식 판매 안내를 확인 중이에요…':'모델명과 용량을 알려 주세요. 같은 조건의 제품끼리 비교해야 가격 차이를 알 수 있어요.');
    message.setAttribute('role','status');card.append(heading,message);list.append(card);
    const edit=el('button','모델·용량 수정','aiTravelPlace');edit.type='button';edit.addEventListener('click',()=>{const input=document.getElementById('aiMapQuestion');input.focus();input.setSelectionRange(input.value.length,input.value.length);});
    const choices=el('div','', 'aiProductLinks');
    const query=intent.requestText||name;
    const search=new URL('https://www.google.com/search');search.searchParams.set('q',query+' site:cellphones.com.vn OR site:fptshop.com.vn OR site:thegioididong.com');
    choices.append(link('판매처의 제품·가격 페이지 검색 ↗',search.href),edit);
    card.append(choices);
    if(!name){productWork=null;return {title:'제품 가격·구매 안내',status:'상품명을 확인한 뒤 가격을 비교합니다.',note:'판매점 평점이나 쇼핑몰 목록을 제품 최저가의 근거로 사용하지 않습니다.'};}
    const timer=setTimeout(()=>work.abort(),9500);
    fetch('/api/product-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),signal:work.signal})
      .then(async response=>{if(!response.ok)throw Error();return response.json();})
      .then(info=>{
        if(!card.isConnected||productWork!==work)return;
        if(info.status==='upcoming'){
          message.textContent='베트남 공식 출시 예정일은 '+info.releaseDate+'입니다.'+(info.preorderDate?' 사전 주문은 '+info.preorderDate+'부터예요.':'')+' 아직 호치민의 현재 구매 가능 최저가 매장을 확인할 수 없어 판매점 순위를 만들지 않았어요.';
        }else message.textContent='요청하신 제품의 판매처별 실시간 가격·재고를 확인하지 못했어요. 최저가 매장을 단정할 수 없습니다. 아래에서 같은 모델·용량·새제품/중고·보증 조건으로 최종 결제 금액을 확인해 주세요.';
        // Only the fixed manufacturer source can become a factual source link.
        if(/^https:\/\/www\.apple\.com\/vn\/iphone-[a-z0-9-]+\/$/.test(info.source||'')){
          choices.prepend(link('Apple 베트남 공식 제품 안내 ↗',info.source));
          if(info.status==='upcoming')card.append(el('small',(info.fresh?'공식 페이지 확인: ':'공식 발표 확인: ')+String(info.checkedAt||'').slice(0,10)+(info.fresh?'':' · 실시간 재확인 불가')));
        }
      }).catch(()=>{if(card.isConnected&&productWork===work)message.textContent='공식 판매 정보를 지금 확인하지 못했어요. 확인되지 않은 가격·재고나 다른 제품으로 대신 안내하지 않습니다. 아래 판매처 검색에서 모델과 용량을 확인해 주세요.';})
      .finally(()=>{clearTimeout(timer);if(productWork===work)productWork=null;});
    return {title:'제품 가격·구매 안내',status:'요청 제품: '+name,note:'확인된 출시 정보에는 출처와 확인일을 표시합니다. 판매처 검색 링크는 가격 비교를 완료한 결과가 아닙니다.'};
  }
  window.AIResultActions={appendDelivery,deliveryIntro,renderProduct,merchantFor,grabUrl,cancel};
})();
