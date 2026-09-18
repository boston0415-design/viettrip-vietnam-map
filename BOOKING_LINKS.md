# Verified reservation links

Checked 2026-09-18 against the 88 public registered places and operator websites.
Only confirmed destinations are enabled; this is not a live availability or price API.
No reservations, payments, or personal details are submitted by the map.

## Registered businesses

| Business | Official source |
| --- | --- |
| Pizza 4P’s Le Thanh Ton | https://pizza4ps.com/vn/ → booking.pizza4ps.com; confirm the branch/address in the selector |
| The Deck Saigon | https://www.thedecksaigon.com/ → the restaurant’s TableCheck page |
| Quán Bụi Original | https://quan-bui.com/original/; Original / 19 Ngô Văn Năm in the reservation form |
| Quán Bụi Garden | https://quan-bui.com/garden/; Garden (1) / Ngô Quang Huy in the reservation form |
| Hum Signature | https://hum-dining.vn/en/homepage/ → Hum Signature TableCheck; check the course and age conditions |
| Opera | https://www.parkhyattsaigonrestaurants.com/opera → Opera TableCheck |
| Square One | https://www.parkhyattsaigonrestaurants.com/square-one → Square One TableCheck |

## Seven transport locations

- Saigon Railway Station: https://dsvn.vn/; linked as online ticket sales from https://vr.com.vn/ on 2026-09-18. Select departure station **Sài Gòn**, destination, date and seat on the external site. No unverified prefilled station URL, live availability claim, purchase, or payment is submitted by the map.
- Saigon Princess: https://www.saigonprincess.com.vn/calendar
- Bạch Đằng / Saigon Waterbus: https://saigonwaterbus.com/trang-chu (select Waterbus, departure and return journey).
- Ho Chi Minh City day and night departure points: https://hopon-hopoff.vn/tour/1-round-ho-chi-minh-city-panoramic-bus-tour/
- Hanoi lake and Opera House departure points: https://hopon-hopoff.vn/tour/1-round-hanoi-panoramic-bus-tour/

## Reservation inquiries — checked 2026-09-18

The separate **예약 문의** action opens a native dialog above the map/detail sheet.
It lists the operator's published channels and branch address. Sending an inquiry
is not a confirmed booking; the customer must receive the operator's confirmation.
Opening this dialog sends no message, initiates no call and makes no database write.

| Registered branch | Verified inquiry routes | Official source |
| --- | --- | --- |
| Golden Lotus Healing World, 16A Street No. 10 | Zalo `2553481319661089451`; Messenger `JjimJilBangQ3`; Facebook `JjimJilBangQ3`; +84 28 3823 9000 | https://goldenlotus.world/en/branches |
| Golden Lotus Spa & Massage Club, 15 Thái Văn Lung | KakaoTalk `_xeMGXT/chat`; Facebook `GoldenLotusSpaSaiGon`; +84 28 3822 1515 | https://saigonwellness.vn/ (footer address and contact links) |
| Ayla Spa Central Saigon, 141–143 Lê Thị Riêng | Facebook `aylaspasaigon`; +84 888 545 767 | https://aylaspa.com/ (Central Saigon address/hotline and linked Facebook) |
| Temple Leaf Spa & Sauna, 32 Thái Văn Lung | +84 28 6291 3656 | https://templeleafsauna.com/bookingonline.html (branch footer) |

These are four verified branches, not blanket coverage of all 88 registered places.
Golden Lotus's gym Messenger account is excluded. Ayla's contact-us page also lists
Hanoi and Royal Saigon branches: those branch-specific chat links are not assigned
to Central Saigon. Temple Leaf's older social-media phone numbers are not substituted
for the number on the operator's current site. No Zalo/WhatsApp/Messenger address is
constructed from a phone number or a guessed page name.

Each contact entry records an exact business identity, source and checked date.
Its action revalidates current place data before opening; changed/deleted businesses
cannot use a stale button. Contact URLs require HTTPS and an exact platform host,
or an international `tel:` number. New channels must be operator-verified before
adding to this catalogue. The supported route types also allow verified WhatsApp
links; none is guessed for these four branches. Platform login/app installation may
be required. Calls/messages, delivery and actual availability were not tested.

The inquiry dialog follows existing panel history (Back closes the top panel) and
supports X/Escape. Phone copying falls back inside the modal's focus boundary.
The existing seven direct business reservations and seven transport bookings remain
direct links. The map stores no chat credentials and submits no member contact data.

## Location review — 2026-09-18

The 98 system points in `EXTRA_DATA` were checked for missing/non-numeric coordinates
and coordinates outside Vietnam's broad extent: 82 have fixed coordinates, 16 use
address lookup, and none is missing both coordinates and an address. This is a
structural check, not an entrance-level or member-business location verification.

Saigon station's old point `(10.78255, 106.67795)` was replaced with the published
station reference `(10.781213, 106.677198)`, rounded from the coordinates at
https://vi.wikipedia.org/wiki/Ga_S%C3%A0i_G%C3%B2n (revision 75024417). Its street
address remains 1 Nguyễn Thông; the ward is updated to Nhiêu Lộc. The map labels
this as the station's representative point, not a verified platform or entrance.
Directions and the marker use the same coordinates.

The Saigon Princess docking address was rechecked against
https://www.saigonprincess.com.vn/contact and the Bạch Đằng Waterbus address against
https://saigonwaterbus.com/ben-tau-bach-dang. Their existing addresses were retained.
Do not infer a precise entrance from a Google embed viewport center or replace
unverified member-business coordinates from a similar name. Other minor location
offsets and airport pickup lanes require place-specific verification.

## Maintenance

`assets/js/booking-links.js` holds the checked URLs, contact channels, source, date, and branch notes.
Business links require the stored public ID, name, category and address to match.
Changing a business identity suspends its link pending another verification.
System points require an exact name, type and source URL match. Similar names and
arbitrary user-supplied URLs never inherit reservation links. Unverified businesses
have no reservation button. Add entries only after checking the exact operator and
branch. Recheck externally managed URLs when the operator changes its booking flow.

Links open an external page with `noopener noreferrer`; member reviews, owner/admin
permissions, filters, counts and database records are not changed by this feature.

## Validation

Targeted tests cover booking eligibility/rendering, mobile compact details, retained
directions, passive hover, InfoWindow Back/X/native close/replacement history, nested
dialogs, install guidance, official address copying, and existing boarding filters.
Google Maps/native browser presentation is emulated; the remote browser was
unavailable, so Android hardware Back and actual phone layout need device verification.
