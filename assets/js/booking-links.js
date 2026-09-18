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
const VERIFIED_POINT_BOOKINGS=Object.freeze([
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
function verifiedBookingFor(feature={}){
  const business=VERIFIED_BUSINESS_BOOKINGS.find(entry=>
    entry.id===feature.id &&
    ['name','category','address'].every(key=>bookingIdentity(entry[key])===bookingIdentity(feature[key])));
  if(business)return business;
  return VERIFIED_POINT_BOOKINGS.find(entry=>
    entry.name===feature.name && entry.type===feature.type && entry.sourceUrl===feature.sourceUrl)||null;
}
function bookingLinkHtml(feature){
  const booking=verifiedBookingFor(feature);
  if(!booking)return '';
  return `<a class="bookingButton" href="${esc(booking.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(feature.name)} 예약하기 · 외부 예약 페이지, 새 창" title="${esc(booking.note)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/></svg><span>예약하기 ↗</span></a>`;
}
function bookingNoteHtml(feature){
  const booking=verifiedBookingFor(feature);
  return booking?`<p class="bookingNote">외부 예약 페이지로 연결됩니다. ${esc(booking.note)}</p>`:'';
}

