/* Community benefits + traveller-ready inquiry. Reads shared data; never writes it. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const dialog=document.createElement('dialog');
  dialog.id='tripCompanion';dialog.className='travellerDialog tripCompanion';dialog.setAttribute('data-no-sheet-resize','');dialog.setAttribute('aria-labelledby','tripTitle');
  dialog.innerHTML=`<header class="tripHead"><div><small>일상탈출 · 여행 도우미</small><h2 id="tripTitle">찾은 곳에서, 할 일까지.</h2></div><button type="button" id="tripClose" aria-label="여행 도우미 닫기">×</button></header>
  <div class="tripBody"><p class="tripIntro">회원 혜택과 방문 후기를 확인하고, 업소에 직접 문의하세요.</p>
  <div class="tripShortcuts"><button type="button" id="tripStay">내 숙소 주변 찾기 <span>숙소를 기준으로 이동을 줄여요 ↗</span></button><a href="./guide/" id="tripGuide">여행 가이드 <span>교통 · 환전 · 현지 이용 정보 ↗</span></a></div>
  <div class="tripScope"><label for="tripCity">여행 지역</label><select id="tripCity"></select></div>
  <nav class="tripTabs" aria-label="여행 도우미 목록"><button type="button" data-trip-tab="benefits" aria-pressed="true">회원 혜택</button><button type="button" data-trip-tab="reviews" aria-pressed="false">방문 후기</button><button type="button" data-trip-tab="saved" aria-pressed="false">저장한 곳</button></nav>
  <p id="tripNote" class="tripNote"></p><div id="tripPlaces"></div></div>`;
  document.body.append(dialog);
  el('tripCity').innerHTML='<option value="all">전체 지역</option>'+Object.entries(CITY_DATA).map(([key,c])=>`<option value="${esc(key)}">${esc(c.label)}</option>`).join('');
  let mode='benefits';
  function render(){
    const city=el('tripCity').value;
    const rows=db().places.filter(p=>placeInCity(p,city)&&!window.PersonalPlaces?.isHidden(p.id)).map(p=>({p,s:stats(p.id)})).filter(({p,s})=>mode==='benefits'?isBenefitPlace(p):mode==='reviews'?s.reviews.length>0:window.PersonalPlaces?.isFavorite(p.id));
    if(mode==='reviews')rows.sort((a,b)=>b.s.reviews.length-a.s.reviews.length);
    el('tripNote').textContent=mode==='benefits'?'등록된 혜택 안내입니다. 적용 대상·인원·예약 조건은 방문 전 업소에 확인하세요.':mode==='reviews'?'회원이 직접 남긴 글입니다. 등록자 평점과 방문 후기를 구분해 보여드려요.':'즐겨찾기한 곳입니다. 이 기기·브라우저에 저장됩니다.';
    el('tripGuide').href='./guide/'+(city==='all'?'':'?city='+encodeURIComponent(city));
    el('tripPlaces').innerHTML=rows.length?rows.map(({p,s})=>{
      const booking=verifiedBookingFor(p),review=s.reviews[0];
      return `<article class="tripCard"><div class="tripCardMeta">${esc(catLabel(p.category))} · ${esc(placeRegionLabel(p))}</div><h3>${esc(p.name)}</h3>${mode==='benefits'?`<p class="tripBenefit">${esc(p.benefitText||'상세 혜택은 업소에 문의해 주세요.')}</p>`:review?`<blockquote>${esc(String(review.text).slice(0,240))}${String(review.text).length>240?'…':''}</blockquote>`:''}<p class="tripEvidence">방문 후기 ${s.reviews.length}개${booking?` · 문의처 ${esc(booking.verifiedOn||'확인일 미기재')}`:' · 예약 문의처 확인 필요'}</p><div class="tripCardActions"><button type="button" data-trip-place="${esc(p.id)}">지도·상세 보기</button>${booking?.mode==='inquiry'?`<button type="button" data-trip-inquiry="${esc(p.id)}">예약 문의 준비</button>`:booking?bookingLinkHtml(p):''}</div></article>`;
    }).join(''):`<p class="tripEmpty">${state.sharedDbLoading?'업소 정보를 불러오는 중입니다.':mode==='saved'?'아직 저장한 곳이 없습니다. 업소 목록의 ☆를 눌러 담아보세요.':mode==='reviews'?'이 지역에는 아직 방문 후기가 없습니다.':'이 지역에 등록된 회원 혜택이 없습니다.'}</p>`;
  }
  function open(){el('tripCity').value=state.city||'all';render();if(!dialog.open)dialog.showModal();}
  el('openTripCompanion').onclick=open;el('tripClose').onclick=()=>dialog.close();el('tripCity').onchange=render;
  el('tripStay').onclick=()=>{dialog.close();el('nearbyStay').click();};
  dialog.addEventListener('click',event=>{
    const tab=event.target.closest('[data-trip-tab]');
    if(tab){mode=tab.dataset.tripTab;dialog.querySelectorAll('[data-trip-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));render();return;}
    const placeButton=event.target.closest('[data-trip-place]');
    if(placeButton){const id=placeButton.dataset.tripPlace;if(!db().places.some(p=>p.id===id))return;dialog.close();window.MapUX?.dismissSearch();selectPlace(id,true,false);return;}
    const inquiry=event.target.closest('[data-trip-inquiry]');
    if(inquiry){dialog.close();if(!openBookingInquiry(inquiry.dataset.tripInquiry))open();}
  });
  document.addEventListener('map-data-saved',()=>{if(dialog.open)render();});
  function prepareInquiry(place,parent){
    parent.querySelector('.tripInquiry')?.remove();
    const section=document.createElement('section');section.className='tripInquiry';
    section.innerHTML=`<h3>베트남어 문의문 만들기</h3><p>날짜·인원을 넣고 복사한 뒤, 아래 문의처에 붙여넣으세요.</p><div class="tripFields"><label>방문 날짜<input id="tripDate" type="date" aria-label="방문 날짜"></label><label>방문 시간<input id="tripTime" type="time" aria-label="방문 시간"></label><label>인원<input id="tripPeople" type="number" min="1" max="99" step="1" value="2" aria-label="방문 인원"></label></div><label class="tripCheck"><input id="tripPrice" type="checkbox" checked> 세금·추가 요금을 포함한 총액 문의</label>${isBenefitPlace(place)?'<label class="tripCheck"><input id="tripBenefitCheck" type="checkbox" checked> 일상탈출 카페 혜택 적용 여부 문의</label>':''}<label for="tripMessage">복사할 베트남어 문의문</label><textarea id="tripMessage" rows="5" readonly></textarea><p id="tripTranslation" class="tripTranslation"></p><button id="tripCopy" type="button">문의문 복사</button><p id="tripCopyStatus" role="status" aria-live="polite">자동 전송되지 않습니다. 예약 확정은 업소 답변으로 확인하세요.</p>`;
    parent.querySelector('#bookingInquiryChannels').before(section);
    function message(){
      const date=section.querySelector('#tripDate').value,time=section.querySelector('#tripTime').value;
      const count=Number(section.querySelector('#tripPeople').value),valid=Number.isInteger(count)&&count>=1&&count<=99;
      const price=section.querySelector('#tripPrice').checked,benefit=section.querySelector('#tripBenefitCheck')?.checked;
      const dateLabel=date?date.split('-').reverse().join('/'):'';
      section.querySelector('#tripCopy').disabled=!valid;
      section.querySelector('#tripMessage').value=valid?`Xin chào ${place.name}. Tôi muốn hỏi đặt chỗ cho ${count} người${dateLabel?' vào ngày '+dateLabel:''}${time?' lúc '+time:''}. Bên mình còn chỗ không ạ?${price?' Vui lòng báo tổng giá, bao gồm thuế và các phụ phí nếu có.':''}${benefit?' Tôi biết đến bên mình qua cộng đồng Hàn Quốc 일상탈출. Ưu đãi dành cho thành viên hiện còn áp dụng không? Vui lòng cho biết điều kiện áp dụng.':''} Cảm ơn!`:'';
      section.querySelector('#tripTranslation').textContent=valid?`뜻: ${dateLabel||'날짜 미지정'} ${time||'시간 미지정'}, ${count}명 예약 가능 여부${price?'와 추가 요금 포함 총액':''}${benefit?', 일상탈출 회원 혜택 및 적용 조건':''}을 문의합니다.`:'인원은 1~99명으로 입력하세요.';
      section.querySelector('#tripCopyStatus').textContent='자동 전송되지 않습니다. 예약 확정은 업소 답변으로 확인하세요.';
    }
    section.addEventListener('input',message);message();
    section.querySelector('#tripCopy').onclick=async()=>{
      const input=section.querySelector('#tripMessage');let copied=false;
      try{await navigator.clipboard.writeText(input.value);copied=true}catch{input.focus();input.select();try{copied=document.execCommand('copy')}catch{}}
      section.querySelector('#tripCopyStatus').textContent=copied?'복사했습니다. 아래 문의처를 열어 붙여넣고 직접 보내세요.':'자동 복사가 되지 않았습니다. 문의문을 선택해 복사해 주세요.';
    };
  }
  window.TripCompanion={open,prepareInquiry};
})();
