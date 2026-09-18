// Curated official booking destinations, checked 2026-09-18.
// Never infer a reservation URL from a place name or accept arbitrary member URLs.
// A changed business identity/address suspends its link until checked again.
const VERIFIED_BUSINESS_BOOKINGS=Object.freeze([
  {
    "id": "a229bbfc-41eb-4749-8da2-4cedecaff5e7",
    "name": "Pizza 4P’s Le Thanh Ton",
    "category": "restaurant",
    "address": "Vincom Building, Lê Thánh Tôn, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "url": "https://booking.pizza4ps.com/",
    "sourceUrl": "https://pizza4ps.com/vn/",
    "note": "예약 화면에서 방문할 지점과 주소를 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "890c1003-06f9-482b-b601-bfa9a8b6e2ff",
    "name": "더 데크 사이공",
    "category": "restaurant",
    "address": "38 Nguyễn Ư Dĩ, St, An Khánh, Hồ Chí Minh 10000 베트남",
    "url": "https://www.tablecheck.com/en/the-deck-saigon/reserve/landing",
    "sourceUrl": "https://www.thedecksaigon.com/",
    "note": "The Deck Saigon · 38 Nguyễn Ư Dĩ",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "c6b8a22b-f577-42ca-8381-37218a4677c5",
    "name": "꽌부이-오리지널",
    "category": "restaurant",
    "address": "19 Ngô Văn Năm, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "url": "https://quan-bui.com/",
    "sourceUrl": "https://quan-bui.com/original/",
    "note": "예약 양식에서 Original · 19 Ngô Văn Năm을 선택하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "4eccf861-1154-461b-b257-20a48f8850c6",
    "name": "콴 부이 가든",
    "category": "restaurant",
    "address": "55A Ngô Quang Huy, An Khánh, Hồ Chí Minh 70000 베트남",
    "url": "https://quan-bui.com/",
    "sourceUrl": "https://quan-bui.com/garden/",
    "note": "예약 양식에서 Garden (1) · Ngô Quang Huy를 선택하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "6eb2c0b0-8052-4d23-8753-ef143725ae6a",
    "name": "Hum Signature",
    "category": "restaurant",
    "address": "34 Võ Văn Tần, Xuân Hòa, Hồ Chí Minh 700000 베트남",
    "url": "https://www.tablecheck.com/vi/hum-signature/reserve/message?utm_source=website",
    "sourceUrl": "https://hum-dining.vn/en/homepage/",
    "note": "Hum Signature의 코스·연령 등 예약 조건을 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "590758f4-d650-4195-a583-15930d8b8632",
    "name": "Opera",
    "category": "restaurant",
    "address": "2 Công trường Lam Sơn, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "url": "https://www.tablecheck.com/en/park-hyatt-saigon-opera/reserve/landing",
    "sourceUrl": "https://www.parkhyattsaigonrestaurants.com/opera",
    "note": "Park Hyatt Saigon의 Opera 레스토랑입니다.",
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "4d17d5da-5f7b-4dc0-b49d-01ca48fcd3bd",
    "name": "Square One",
    "category": "restaurant",
    "address": "2 Công trường Lam Sơn, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "url": "https://www.tablecheck.com/en/park-hyatt-saigon-square-one/reserve/landing",
    "sourceUrl": "https://www.parkhyattsaigonrestaurants.com/square-one",
    "note": "Park Hyatt Saigon의 Square One 레스토랑입니다.",
    "verifiedOn": "2026-09-18"
  }
]);
// Contact channels are copied from the operator site, never inferred from a phone/name.
const VERIFIED_BUSINESS_CONTACTS=Object.freeze([
  {
    "id": "4150f0a4-0dc5-4454-8b8e-e32c1c4fc092",
    "name": "골든로터스 힐링 월드",
    "category": "spa",
    "address": "16A Đ. Số 10, An Khánh, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://goldenlotus.world/en/branches",
    "note": "16A Street No. 10 지점의 스파 문의 채널입니다. 원하는 이용권·서비스와 방문 일정을 알려주세요.",
    "channels": [
      {
        "kind": "zalo",
        "url": "https://zalo.me/2553481319661089451"
      },
      {
        "kind": "messenger",
        "url": "https://m.me/JjimJilBangQ3"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/JjimJilBangQ3"
      },
      {
        "kind": "phone",
        "url": "tel:+842838239000",
        "display": "+84 28 3823 9000"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "264290b4-1b37-4f6d-bde8-79b54ec467a1",
    "name": "골든로터스 스파 & 마사지 클럽",
    "category": "spa",
    "address": "15 Thái Văn Lung, Sài Gòn, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://saigonwellness.vn/",
    "note": "15 Thái Văn Lung 지점입니다. 당일 예약은 전화 문의를 권장합니다.",
    "channels": [
      {
        "kind": "kakao",
        "url": "https://pf.kakao.com/_xeMGXT/chat"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/GoldenLotusSpaSaiGon"
      },
      {
        "kind": "phone",
        "url": "tel:+842838221515",
        "display": "+84 28 3822 1515"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "29a25657-68f0-437a-adcf-ffaff2d56f1a",
    "name": "아일라스파 사이공",
    "category": "spa",
    "address": "141-143 Lê Thị Riêng, Bến Thành, Hồ Chí Minh 10000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://aylaspa.com/",
    "note": "Ayla Spa Central Saigon · 141–143 Lê Thị Riêng 지점을 지정해 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/aylaspasaigon/"
      },
      {
        "kind": "phone",
        "url": "tel:+84888545767",
        "display": "+84 888 545 767"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "ab1794e5-1897-4a13-920d-688b6cdffaa7",
    "name": "템플리프 사우나 & 스파",
    "category": "spa",
    "address": "32 Thái Văn Lung, Sài Gòn, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://templeleafsauna.com/bookingonline.html",
    "note": "32 Thái Văn Lung 지점입니다. 원하는 서비스와 예약 가능 시간을 전화로 확인하세요.",
    "channels": [
      {
        "kind": "phone",
        "url": "tel:+842862913656",
        "display": "+84 28 6291 3656"
      }
    ],
    "verifiedOn": "2026-09-18"
  }
]);
const VERIFIED_POINT_BOOKINGS=Object.freeze([
  {
    "name": "사이공역",
    "type": "기차역",
    "sourceUrl": "https://vr.com.vn/",
    "url": "https://dsvn.vn/",
    "label": "기차표 예약",
    "note": "베트남철도 공식 예매: 출발역 Sài Gòn을 선택하고 도착역·날짜·좌석을 확인하세요. 잔여석·요금·결제 가능 여부는 예약 사이트에서 확인됩니다.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "사이공 프린세스 · 디너 유람선 승선",
    "type": "유람선·수상버스",
    "sourceUrl": "https://www.saigonprincess.com.vn/contact",
    "url": "https://www.saigonprincess.com.vn/calendar",
    "note": "날짜·식사 포함 상품·승선 시간을 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "바익당 선착장 · 사이공 워터버스",
    "type": "유람선·수상버스",
    "sourceUrl": "https://saigonwaterbus.com/ben-tau-bach-dang",
    "url": "https://saigonwaterbus.com/trang-chu",
    "note": "Waterbus 상품의 Bạch Đằng 출발편과 돌아오는 편을 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "시티투어 버스 · 중앙우체국 낮 출발",
    "type": "시티투어 버스",
    "sourceUrl": "https://hopon-hopoff.vn/tour/1-round-ho-chi-minh-city-panoramic-bus-tour/",
    "url": "https://hopon-hopoff.vn/tour/1-round-ho-chi-minh-city-panoramic-bus-tour/",
    "note": "낮·야간 상품과 출발 장소를 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "시티투어 버스 · 응우옌후에 야간 출발",
    "type": "시티투어 버스",
    "sourceUrl": "https://hopon-hopoff.vn/tour/1-round-ho-chi-minh-city-panoramic-bus-tour/",
    "url": "https://hopon-hopoff.vn/tour/1-round-ho-chi-minh-city-panoramic-bus-tour/",
    "note": "낮·야간 상품과 출발 장소를 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "시티투어 버스 · 호안끼엠 호수 출발",
    "type": "시티투어 버스",
    "sourceUrl": "https://hopon-hopoff.vn/tour/1-round-hanoi-panoramic-bus-tour/",
    "url": "https://hopon-hopoff.vn/tour/1-round-hanoi-panoramic-bus-tour/",
    "note": "탑승 날짜의 집결 장소를 예약 안내에서 확인하세요.",
    "verifiedOn": "2026-09-18"
  },
  {
    "name": "시티투어 버스 · 하노이 오페라하우스 출발",
    "type": "시티투어 버스",
    "sourceUrl": "https://hopon-hopoff.vn/tour/1-round-hanoi-panoramic-bus-tour/",
    "url": "https://hopon-hopoff.vn/tour/1-round-hanoi-panoramic-bus-tour/",
    "note": "탑승 날짜의 집결 장소를 예약 안내에서 확인하세요.",
    "verifiedOn": "2026-09-18"
  }
]);
function bookingIdentity(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase()}
const BOOKING_CONTACT_TYPES=Object.freeze({
  zalo:{label:'Zalo로 문의',hosts:['zalo.me']},
  messenger:{label:'Messenger로 문의',hosts:['m.me','www.messenger.com','messenger.com']},
  facebook:{label:'Facebook 페이지',hosts:['www.facebook.com','facebook.com','m.facebook.com']},
  kakao:{label:'카카오톡으로 문의',hosts:['pf.kakao.com','open.kakao.com']},
  whatsapp:{label:'WhatsApp으로 문의',hosts:['wa.me','api.whatsapp.com']},
  phone:{label:'전화로 문의',hosts:[]}
});
function validBookingContact(channel){
  if(!channel || !BOOKING_CONTACT_TYPES[channel.kind])return false;
  if(channel.kind==='phone')return /^tel:\+[1-9]\d{7,14}$/.test(channel.url||'');
  try{
    const url=new URL(channel.url);
    return url.protocol==='https:' && !url.username && !url.password && !url.port &&
      BOOKING_CONTACT_TYPES[channel.kind].hosts.includes(url.hostname) && url.pathname.length>1;
  }catch{return false}
}
function verifiedBookingFor(feature={}){
  const business=[...VERIFIED_BUSINESS_BOOKINGS,...VERIFIED_BUSINESS_CONTACTS].find(entry=>
    entry.id===feature.id &&
    ['name','category','address'].every(key=>bookingIdentity(entry[key])===bookingIdentity(feature[key])));
  if(business)return business.mode==='inquiry' && !business.channels.some(validBookingContact)?null:business;
  return VERIFIED_POINT_BOOKINGS.find(entry=>
    entry.name===feature.name && entry.type===feature.type && entry.sourceUrl===feature.sourceUrl)||null;
}
function bookingLinkHtml(feature){
  const booking=verifiedBookingFor(feature);
  if(!booking)return '';
  if(booking.mode==='inquiry')return `<button type="button" class="bookingButton" data-booking-inquiry="${esc(booking.id)}" aria-haspopup="dialog" aria-controls="bookingInquiryDialog" aria-label="${esc(feature.name)} 예약 문의 방법 보기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z"/><path d="M7 10h8M7 14h5"/></svg><span>예약 문의</span></button>`;
  const label=booking.label||'예약하기';
  return `<a class="bookingButton" href="${esc(booking.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(feature.name)} ${esc(label)} · 외부 예약 페이지, 새 창" title="${esc(booking.note)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/></svg><span>${esc(label)} ↗</span></a>`;
}
function bookingNoteHtml(feature){
  const booking=verifiedBookingFor(feature);
  if(booking?.mode==='inquiry')return '<p class="bookingNote">업소에 직접 예약을 문의할 수 있습니다. 확정 여부는 업소 답변으로 확인하세요.</p>';
  return booking?`<p class="bookingNote">외부 예약 페이지로 연결됩니다. ${esc(booking.note)}</p>`:'';
}

function openBookingInquiry(id){
  // Revalidate current public data when opening: stale rendered buttons must not
  // route a renamed/moved/deleted place to another branch's contact account.
  const place=typeof db==='function'?db().places.find(p=>p.id===id):null;
  const booking=place && verifiedBookingFor(place);
  const dialog=document.getElementById('bookingInquiryDialog');
  if(!dialog || booking?.mode!=='inquiry')return false;
  const channels=booking.channels.filter(validBookingContact);
  if(!channels.length)return false;
  dialog.querySelector('#bookingInquiryPlace').textContent=place.name;
  dialog.querySelector('#bookingInquiryAddress').textContent=place.address;
  dialog.querySelector('#bookingInquiryNote').textContent=booking.note;
  dialog.querySelector('#bookingInquiryChannels').innerHTML=channels.map(channel=>{
    const phone=channel.kind==='phone',label=BOOKING_CONTACT_TYPES[channel.kind].label;
    const hint=phone?channel.display:channel.kind==='facebook'?'페이지에서 메시지 보내기':'앱 또는 웹으로 열기';
    return `<div class="bookingContactRow"><a class="bookingContactLink" href="${esc(channel.url)}" ${phone?'':'target="_blank" rel="noopener noreferrer"'} aria-label="${esc(place.name)} ${esc(label)}${phone?'':' · 외부 서비스, 새 창'}"><span><strong>${esc(label)}</strong><small>${esc(hint||channel.url.slice(4))}</small></span><span class="bookingContactArrow" aria-hidden="true">↗</span></a>${phone?`<button type="button" class="bookingPhoneCopy" data-booking-phone="${esc(channel.url.slice(4))}" aria-label="${esc(channel.display||'전화번호')} 복사">번호 복사</button>`:''}</div>`;
  }).join('');
  const source=dialog.querySelector('#bookingInquirySource');
  source.href=booking.sourceUrl;
  dialog.querySelector('#bookingInquiryChecked').textContent=`${booking.verifiedOn} 확인`;
  dialog.querySelector('#bookingInquiryStatus').textContent='';
  if(!dialog.open)dialog.showModal();
  return true;
}

async function copyBookingPhone(button){
  const dialog=button.closest('#bookingInquiryDialog'),number=button.dataset.bookingPhone;
  if(!dialog || !/^\+[1-9]\d{7,14}$/.test(number||''))return;
  let copied=false;
  try{await navigator.clipboard.writeText(number);copied=true}catch{}
  if(!copied){
    // Native modal focus is confined to the top layer, so place the fallback
    // inside this dialog rather than the document body.
    const input=document.createElement('textarea');input.value=number;
    input.readOnly=true;input.setAttribute('aria-label','복사할 전화번호');
    input.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;opacity:0';
    dialog.append(input);input.focus({preventScroll:true});input.select();input.setSelectionRange(0,number.length);
    try{copied=Boolean(document.execCommand('copy'))}catch{}
    input.remove();button.focus({preventScroll:true});
  }
  dialog.querySelector('#bookingInquiryStatus').textContent=copied?'전화번호를 복사했습니다.':'복사하지 못했습니다. 표시된 전화번호를 길게 눌러 복사해 주세요.';
}

document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  const trigger=target?.closest('[data-booking-inquiry]');
  if(trigger){
    if(!openBookingInquiry(trigger.dataset.bookingInquiry)){
      trigger.textContent='연락처 확인 필요';trigger.disabled=true;
    }
    return;
  }
  const copy=target?.closest('[data-booking-phone]');
  if(copy){copyBookingPhone(copy);return}
  if(target?.closest('#closeBookingInquiry'))document.getElementById('bookingInquiryDialog')?.close();
});
