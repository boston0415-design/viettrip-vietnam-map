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

`assets/js/booking-links.js` holds the checked URLs, source, date, and branch notes.
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
