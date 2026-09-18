# Facebook / Messenger reservation inquiry audit — 2026-09-18

Reviewed against the 96 current public place records. Added 16 missing inquiry routes; retained 7 direct business reservations, 4 existing business inquiry routes, and 7 transport reservation routes. This is a curated extension, not a claim that every listed business accepts reservations.

Links below were published by the operators on their own sites. Public Facebook pages can require login; message delivery, response time, availability, and reservation acceptance were not tested. The map opens a contact channel and never sends a message or claims confirmation.

| Registered place | Official verification source | Added channels |
| --- | --- | --- |
| Lousiane Brewhouse Nha Trang Restaurant & Craft Beer | https://louisianebrewhouse.com.vn/contact-us-reservations/ | https://www.facebook.com/lousianebrewhouserestaurantnhatrang |
| MZ Club - Live Music | https://mzentertainment.vn/index.php | https://www.facebook.com/MZClubSaigon · https://zalo.me/0906025658 |
| Sailing Club | https://sailingclubnhatrang.com/ | https://m.me/sailingclubnhatrang |
| 스카이라이트 | https://skylightnhatrang.com/ | https://www.facebook.com/skylightnhatrang |
| East West Brewing – Sai Gon 🍺 | https://eastwestbrewing.vn/taproom/ho-chi-minh | https://www.facebook.com/eastwestbrewing.saigon/ |
| Sushi Hokkaido Sachi | https://sushihokkaidosachi.com.vn/location/ | https://www.facebook.com/sushihokkaidosachi/ |
| Yakiniku Yazawa Saigon | https://yazawameat.vn/ | https://www.facebook.com/yazawa.saigon/ |
| 꽌웃웃 | https://quanutut.com/ | https://www.facebook.com/quanutut |
| 냐 항 응온 | https://nhahangngon.com.vn/ | https://www.facebook.com/Nhahang.QuanAnNgon/ |
| 라 브라세리 | https://hotelnikkosaigon.com.vn/ | https://www.facebook.com/hotelnikkosaigonvn/ |
| 벱메인 1- 레 탄 톤 | https://bep.mein.vn/ | https://m.me/bepmein · https://www.facebook.com/bepmein |
| 벱메인2- 응우옌 타이 빈 | https://bep.mein.vn/ | https://m.me/BepMeInNguyenThaiBinh |
| MIUMIU SPA 2 | https://miumiuspa.com/ | https://www.facebook.com/miumiuspa.com.vn · https://wa.me/84971769659 |
| Wink Saigon Centre, part of Unscripted by Hyatt | https://wink-hotels.com/ | https://www.facebook.com/WinkHotels/ |
| 뉴월드 사이공 호텔 | https://saigon.newworldhotels.com/en/ | https://www.facebook.com/Saigon.NewWorldHotel |
| 베이 호텔 호치민 | https://www.bayhotelhcm.com/ | https://www.facebook.com/bayhotelhochiminh/ |

## Branch checks

- Bếp Mẹ Ỉn: https://bep.mein.vn/contact/ lists 136/9 Lê Thánh Tôn and 165/50 Nguyễn Thái Bình. The homepage supplies a different Messenger destination for each branch.
- Sushi Hokkaido Sachi: the location page lists 139 A–B Nguyễn Trãi; the Facebook destination is the shared operator page.
- Miu Miu: 2B Chu Mạnh Trinh and the WhatsApp link explicitly labeled Miumiu 2 match the registered branch.
- East West: the operator’s Ho Chi Minh City (Downtown Saigon) page explicitly points its Book a table buttons to eastwestbrewing.saigon; the general corporate social page was not substituted.
- Quán Ụt Ụt: the homepage loads /assets/index-Ca6QT5Pe.js, which contains the official Facebook link and the 168 Võ Văn Kiệt branch.
- La Brasserie: connected to Hotel Nikko Saigon’s published page; the inquiry note explicitly asks guests to name the restaurant, rather than request a hotel room.
- Wink and Sushi use shared operator pages; inquiry notes identify the exact branch.
- Existing ID/name/category/address guards suspend a curated route when the public place identity changes.

## Withheld / unresolved candidates

- Onsi Spa: official https://onsispa.com/ publishes 6/30 Nguyễn Thiện Thuật, while the registered place says 08 Nguyễn Thiện Thuật. No link or address was changed without resolving that mismatch.
- Apartment building listings (Landmark 1, Landmark 81, Millennium, Sunrise) do not identify one verified rental operator; no arbitrary host or broker was added.
- Searches or attempted source reads for Red Bison Grill, FUME, CINÉ Saigon, Weeknd, 137 Massage, Luxury Anna, Sen Trắng, Orchid, RaRa, and The Log did not provide sufficient accessible primary-source confirmation of an exact official Facebook destination. They remain unlinked.
- PAPI surfaced conflicting contact details across its social page and an apparent venue site; withheld pending stronger operator verification.
- No booking contact was invented for currency exchanges, shopping centers, or public attractions.

## Validation

- All 20 inquiry entries exercise compact/mobile and desktop rendering, exact branch identity, safe URLs, open/close, browser Back, Escape, and preserved map filters in JSDOM.
- Social-only entries have no empty phone action; the original phone entries retain clipboard success/fallback/failure checks.
- Existing direct business and transport reservations remain covered by booking-links.test.cjs.
- Facebook/Messenger apps and signed-in messaging sessions were not exercised; outbound destinations were verified from operator-published links.
