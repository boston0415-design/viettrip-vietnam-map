// Curated official booking destinations; see each entry's verification date.
// Never infer a reservation URL from a place name or accept arbitrary member URLs.
// A changed business identity/address suspends its link until checked again.
const VERIFIED_BUSINESS_BOOKINGS=Object.freeze([
  {
    "id": "d2a04f77-2218-4101-b9be-3fdf172a8958",
    "name": "렉스 호텔",
    "category": "stay",
    "address": "141 Nguyễn Huệ, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "url": "https://www.rexhotelsaigon.com/",
    "sourceUrl": "https://www.rexhotelsaigon.com/",
    "note": "141 Nguyễn Huệ의 Rex Hotel Saigon 공식 사이트입니다. Book Now에서 숙박 날짜·인원·객실과 취소 조건을 확인하세요.",
    "verifiedOn": "2026-09-19"
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
    "id": "e29a5622-8556-4fee-9814-85089929cbd7",
    "name": "THREE TABOM SPA",
    "category": "spa",
    "address": "Tầng 1, TTTM The Garden, Đ. Mễ Trì, Từ Liêm, Hà Nội, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.threetabomspa.com/",
    "note": "The Garden Shopping Mall G+1층의 Three Tabom Spa 공식 예약 문의입니다. 원하는 서비스와 날짜·시간을 알리고 업소의 확정 답변을 확인하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://web.facebook.com/threetabomspa"
      },
      {
        "kind": "phone",
        "url": "tel:+84384308587",
        "display": "+84 38 430 8587"
      }
    ],
    "verifiedOn": "2026-09-24"
  },
  {
    "id": "500ccf1c-201f-4837-abd1-f465c4317a21",
    "name": "Phở Thìn Mỹ Đình",
    "category": "restaurant",
    "address": "CT9 Mỹ Đình Sông Đà, Từ Liêm, Hà Nội, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.facebook.com/61579495108369/",
    "note": "CT9 Mỹ Đình 지점의 공식 예약 문의입니다. 방문 날짜·시간·인원을 알리고 업소의 확정 답변을 확인하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/61579495108369/"
      },
      {
        "kind": "phone",
        "url": "tel:+842432006379",
        "display": "+84 24 3200 6379"
      }
    ],
    "verifiedOn": "2026-09-24"
  },
  {
    "id": "f5bdf96e-c292-46ae-bbd6-4b5bdebe25d7",
    "name": "오니스시 초밥&참치 (하노이점)",
    "category": "restaurant",
    "address": "21 Ngõ 39 Đ. Đình Thôn, Từ Liêm, Hà Nội, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.facebook.com/onisushihanoi/",
    "note": "21 Ngõ 39 Đình Thôn의 오니스시 하노이점 공식 예약 문의입니다. 카카오 오픈채팅 참여코드는 onisushi이며, 날짜·시간·인원을 알리고 확정 답변을 확인하세요.",
    "channels": [
      {
        "kind": "kakao",
        "url": "https://open.kakao.com/o/gxpspU3b"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/onisushihanoi/"
      },
      {
        "kind": "phone",
        "url": "tel:+84364682281",
        "display": "+84 36 468 2281"
      }
    ],
    "verifiedOn": "2026-09-24"
  },
  {
    "id": "12579ac9-0154-40f9-b58c-bc666ed78451",
    "name": "NJ184 Vietnam Head Spa & Massage | 호치민 마사지 | 越式洗頭按摩",
    "category": "barber",
    "address": "184 Trần Hưng Đạo, Cầu Ông Lãnh, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://nj184barbershop.com/lien-he",
    "note": "184 Trần Hưng Đạo의 NJ184 공식 예약 문의 채널입니다. 원하는 서비스와 날짜·시간을 알리고 업소의 확정 답변을 확인하세요.",
    "channels": [
      {
        "kind": "zalo",
        "url": "https://zalo.me/0708999184"
      },
      {
        "kind": "whatsapp",
        "url": "https://wa.me/message/HHXWKMM2B7MBB1"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/profile.php?id=61569992383435"
      },
      {
        "kind": "phone",
        "url": "tel:+84708999184",
        "display": "+84 708 999 184"
      }
    ],
    "verifiedOn": "2026-09-21"
  },
  {
    "id": "4a33bd0b-9bd7-433e-879b-00348ff6e15c",
    "name": "The View Rooftop Bar",
    "category": "bar",
    "address": "On the 9th floor of Duc Vuong Hotel, 195 Bùi Viện, Bến Thành, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://ducvuonghotel.com/en/restaurant-2/",
    "note": "Duc Vuong Hotel · 195 Bùi Viện의 The View Rooftop Bar입니다. 객실이 아닌 루프톱 테이블 예약이라고 말하고 방문 날짜·시간·인원을 알려주세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/TheViewRooftopBarHCM/"
      },
      {
        "kind": "phone",
        "url": "tel:+84944795522",
        "display": "+84 944 795 522"
      }
    ],
    "verifiedOn": "2026-09-19"
  },
  {
    "id": "00c49c81-8085-43b9-a7a1-284bc2550cd2",
    "name": "에스에이치 가든",
    "category": "restaurant",
    "address": "26 Ngô Quang Huy, An Khánh, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://shgarden.com.vn/",
    "note": "SH Garden Thảo Điền · 26 Ngô Quang Huy 지점의 예약 전화입니다. 페이스북은 공통 계정이므로 Đồng Khởi점이 아닌 Thảo Điền점이라고 지정하세요.",
    "channels": [
      {
        "kind": "phone",
        "url": "tel:+84965596266",
        "display": "+84 965 596 266"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/shgardenhcm"
      }
    ],
    "verifiedOn": "2026-09-19"
  },
  {
    "id": "e6acd5e1-242d-4d45-9195-953dcb0b9306",
    "name": "카라벨 사이공",
    "category": "stay",
    "address": "19-23 Công trường Lam Sơn, Sài Gòn, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.caravellehotel.com/contact-us/",
    "note": "19–23 Lam Son Square의 Caravelle Saigon 호텔 공식 연락처입니다. 객실 예약 담당 연결을 요청하고 숙박 날짜·인원·객실 및 취소 조건을 확인하세요.",
    "channels": [
      {
        "kind": "phone",
        "url": "tel:+842838234999",
        "display": "+84 28 3823 4999"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/caravellesaigon"
      }
    ],
    "verifiedOn": "2026-09-19"
  },
  {
    "id": "3b69b891-1c6e-465a-9379-b1dd61ce1c38",
    "name": "파크 하얏트 사이공",
    "category": "stay",
    "address": "2 Công trường Lam Sơn, Bến Nghé, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.hyatt.com/park-hyatt/en-US/saiph-park-hyatt-saigon",
    "note": "2 Lam Son Square의 Park Hyatt Saigon 대표전화입니다. 객실 예약 담당 연결을 요청하고 날짜·인원·객실 및 예약 조건을 확인하세요.",
    "channels": [
      {
        "kind": "phone",
        "url": "tel:+842838241234",
        "display": "+84 28 3824 1234"
      }
    ],
    "verifiedOn": "2026-09-19"
  },
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
  },
  {
    "id": "d1d8099f-8864-43ef-8025-7f77771b92d1",
    "name": "Lousiane Brewhouse Nha Trang Restaurant & Craft Beer",
    "category": "bar",
    "address": "Lô 29 Trần Phú, Nha Trang, Khánh Hòa 650000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://louisianebrewhouse.com.vn/contact-us-reservations/",
    "note": "Lô 29 Trần Phú 지점입니다. 방문 날짜·시간·인원을 알려 예약 가능 여부를 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/lousianebrewhouserestaurantnhatrang"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "a3c685fa-2d7d-459c-a0bc-f5d6d3cac080",
    "name": "MZ Club - Live Music",
    "category": "bar",
    "address": "56 Bùi Thị Xuân, Bến Thành, Hồ Chí Minh 71009 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://mzentertainment.vn/index.php",
    "note": "56 Bùi Thị Xuân의 MZ Club 문의 채널입니다. 공연 일정과 테이블 예약 조건을 확인하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/MZClubSaigon"
      },
      {
        "kind": "zalo",
        "url": "https://zalo.me/0906025658"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "43394a14-497e-4ad9-8c91-062bd48f313a",
    "name": "Sailing Club",
    "category": "bar",
    "address": "72 74 Trần Phú, Nha Trang, Khánh Hòa 570000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://sailingclubnhatrang.com/",
    "note": "72–74 Trần Phú 지점의 공식 예약 Messenger입니다. 방문 일시·인원과 원하는 좌석을 문의하세요.",
    "channels": [
      {
        "kind": "messenger",
        "url": "https://m.me/sailingclubnhatrang"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "4dd4eb44-4e31-4ec3-b0c7-c5b68913cb29",
    "name": "스카이라이트",
    "category": "bar",
    "address": "38 Trần Phú, Phường, Nha Trang, Khánh Hòa 650000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://skylightnhatrang.com/",
    "note": "38 Trần Phú의 Skylight입니다. 루프톱 테이블 또는 Lá Kitchen 식사 중 원하는 이용 방식과 일정을 알려주세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/skylightnhatrang"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "6a01a7f0-3f2b-443b-92cb-468d085503aa",
    "name": "East West Brewing – Sai Gon 🍺",
    "category": "restaurant",
    "address": "181 Lý Tự Trọng, Bến Thành, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://eastwestbrewing.vn/taproom/ho-chi-minh",
    "note": "호치민 Downtown Saigon 지점의 공식 예약 안내에서 연결한 페이지입니다. 181 Lý Tự Trọng 지점으로 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/eastwestbrewing.saigon/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "8b625d7d-9da2-4aa0-ac03-43984b809ea4",
    "name": "Sushi Hokkaido Sachi",
    "category": "restaurant",
    "address": "139 A-B Nguyễn Trãi, Bến Thành, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://sushihokkaidosachi.com.vn/location/",
    "note": "공식 공통 페이지입니다. 139 A–B Nguyễn Trãi 지점을 지정하고 방문 시간·인원을 알려주세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/sushihokkaidosachi/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "15eae798-a243-4241-a984-a885ae47d46e",
    "name": "Yakiniku Yazawa Saigon",
    "category": "restaurant",
    "address": "219 Điện Biên Phủ, Xuân Hòa, Hồ Chí Minh 70000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://yazawameat.vn/",
    "note": "219 Điện Biên Phủ의 Yakiniku Yazawa Saigon입니다. 방문 날짜·시간·인원을 알려 예약 가능 여부를 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/yazawa.saigon/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "2fd8c945-2e8f-4e7c-a31f-5cfa39c32e47",
    "name": "꽌웃웃",
    "category": "restaurant",
    "address": "168 Võ Văn Kiệt, P, Bến Thành, Hồ Chí Minh 70000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://quanutut.com/",
    "note": "공식 공통 페이지입니다. 168 Võ Văn Kiệt 지점을 지정하고 예약 가능 여부를 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/quanutut"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "acbc3ab7-57bd-474a-86c3-9d62e97db797",
    "name": "냐 항 응온",
    "category": "restaurant",
    "address": "160 Pasteur, Quận 1, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://nhahangngon.com.vn/",
    "note": "160 Pasteur의 Ngon Sài Gòn 지점입니다. 다른 도시 지점과 혼동하지 않도록 주소와 방문 일정을 함께 알려주세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/Nhahang.QuanAnNgon/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "87318604-17e7-47a8-b411-e8a66d641d55",
    "name": "라 브라세리",
    "category": "restaurant",
    "address": "235 Nguyễn Văn Cừ, Nguyễn Cư Trinh, 1, Hotel Nikko Saigon, 235 Nguyễn Văn Cừ, Cầu Ông Lãnh, Hồ Chí Minh 70000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://hotelnikkosaigon.com.vn/",
    "note": "Hotel Nikko Saigon의 공식 페이지입니다. 객실 대신 La Brasserie 식사 예약을 원한다고 적고 날짜·인원·식사 시간을 알려주세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/hotelnikkosaigonvn/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "ac3d368a-ae8b-458d-b4ae-a2302a0e86d7",
    "name": "벱메인 1- 레 탄 톤",
    "category": "restaurant",
    "address": "136/9 Lê Thánh Tôn, Bến Thành, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://bep.mein.vn/",
    "note": "벱메인 1호점 · 136/9 Lê Thánh Tôn의 공식 예약 Messenger입니다. 방문 날짜·시간·인원을 알려주세요.",
    "channels": [
      {
        "kind": "messenger",
        "url": "https://m.me/bepmein"
      },
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/bepmein"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "b4060ec5-a8a5-4566-ab5e-9bfca9701c22",
    "name": "벱메인2- 응우옌 타이 빈",
    "category": "restaurant",
    "address": "165/50 Nguyễn Thái Bình, Bến Thành, Hồ Chí Minh, 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://bep.mein.vn/",
    "note": "벱메인 2호점 · 165/50 Nguyễn Thái Bình의 공식 예약 Messenger입니다. 방문 날짜·시간·인원을 알려주세요.",
    "channels": [
      {
        "kind": "messenger",
        "url": "https://m.me/BepMeInNguyenThaiBinh"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "c445b290-232a-4252-8d91-97b5d864ffd0",
    "name": "MIUMIU SPA 2",
    "category": "spa",
    "address": "2B Chu Mạnh Trinh, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://miumiuspa.com/",
    "note": "Miu Miu 2 · 2B Chu Mạnh Trinh 지점을 지정하세요. 원하는 마사지·인원·시간과 당일 운영 여부를 확인하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/miumiuspa.com.vn"
      },
      {
        "kind": "whatsapp",
        "url": "https://wa.me/84971769659"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "2e287163-0670-4370-a81a-f2904ff22bde",
    "name": "Wink Saigon Centre, part of Unscripted by Hyatt",
    "category": "stay",
    "address": "75 Nguyễn Bỉnh Khiêm, Ward, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://wink-hotels.com/",
    "note": "Wink Hotels 공식 공통 페이지입니다. Saigon Centre · 75 Nguyễn Bỉnh Khiêm을 지정하고 숙박 날짜·인원·객실을 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/WinkHotels/"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "961940f4-eb4d-4b5d-9363-692b570fd591",
    "name": "뉴월드 사이공 호텔",
    "category": "stay",
    "address": "76 Lê Lai, Bến Thành, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://saigon.newworldhotels.com/en/",
    "note": "76 Lê Lai의 New World Saigon Hotel 공식 페이지입니다. 숙박 날짜·인원·객실과 예약 조건을 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/Saigon.NewWorldHotel"
      }
    ],
    "verifiedOn": "2026-09-18"
  },
  {
    "id": "5e376d45-d6ec-49fe-b36a-2d13f86b387f",
    "name": "베이 호텔 호치민",
    "category": "stay",
    "address": "7 Ngô Văn Năm, Sài Gòn, Hồ Chí Minh 700000 베트남",
    "mode": "inquiry",
    "sourceUrl": "https://www.bayhotelhcm.com/",
    "note": "7 Ngô Văn Năm의 Bay Hotel Ho Chi Minh 공식 페이지입니다. 숙박 날짜·인원·객실과 예약 조건을 문의하세요.",
    "channels": [
      {
        "kind": "facebook",
        "url": "https://www.facebook.com/bayhotelhochiminh/"
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
  messenger:{label:'메신저로 문의',hosts:['m.me','www.messenger.com','messenger.com']},
  facebook:{label:'페이스북으로 문의',hosts:['www.facebook.com','facebook.com','m.facebook.com','web.facebook.com']},
  tiktok:{label:'틱톡 예약 안내',hosts:['www.tiktok.com','tiktok.com']},
  kakao:{label:'카카오톡으로 문의',hosts:['pf.kakao.com','open.kakao.com']},
  whatsapp:{label:'WhatsApp으로 문의',hosts:['wa.me','api.whatsapp.com']},
  phone:{label:'전화로 문의',hosts:[]}
});
function validBookingContact(channel){
  if(!channel || !BOOKING_CONTACT_TYPES[channel.kind])return false;
  if(channel.kind==='phone')return /^tel:\+[1-9]\d{7,14}$/.test(channel.url||'');
  try{
    const url=new URL(channel.url);
    const allowed=url.protocol==='https:' && !url.username && !url.password && !url.port &&
      BOOKING_CONTACT_TYPES[channel.kind].hosts.includes(url.hostname) && url.pathname.length>1;
    if(!allowed)return false;
    // Curate canonical operator profiles; short links and arbitrary videos are not
    // reservation destinations. The operator must publish a booking inquiry route.
    if(channel.kind==='tiktok')return /^\/@[A-Za-z0-9._]+\/?$/.test(url.pathname) && !url.search && !url.hash;
    return true;
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
    const hint=phone?channel.display:channel.kind==='facebook'?'페이지의 메시지 버튼으로 문의':channel.kind==='tiktok'?'공식 프로필에서 예약 안내 확인':'앱 또는 웹으로 열기';
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
