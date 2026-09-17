# Reviews, transportation and administrative boundaries

Updated 2026-09-17.

## Visitor flows

- Header **회원 후기** opens a native dialog with the newest written reviews across all cities. Rating-only entries are excluded. Pages contain 20 rows; failures show a retry action instead of an empty-success message.
- A review's business name opens its detail panel after refreshing that business's public record and all its feedback. Same-city filters remain unchanged; choosing a business in another city switches to that city.
- **공항·교통 안내** offers nine destination guides, arrival-terminal links, pickup steps, transport choices, useful Vietnamese phrases, and selected-business address copy / Google Maps directions.
- **행정구역 경계** loads a self-hosted GeoJSON file on demand and draws a white halo with a dark red border. It preserves existing category/rating filters. Changing the travel city removes the old boundary and invalidates pending requests.
- Current provincial boundaries use the 2025 reform dataset. Historic districts are explicitly labelled **2020 / 이전**. They must not be presented as current wards. See `assets/data/admin/SOURCES.md` for source versions, licence and processing.
- Default camera bounds show the principal land polygon. **전체 경계** includes offshore components; **해제** removes only the administrative layer.

## Travel sources

Checked 2026-09-17. Operational changes may supersede these instructions; visitors are directed to final app and airport signage.

- Tan Son Nhat T1/D1 and T3/PNA: https://www.grab.com/vn/blog/driver/car/sanbaytansonnhat/
- T3 passenger directions: https://www.grab.com/vn/en/blog/huong-dan-don-tra-grabcar-tai-ga-quoc-noi-nha-ga-t3-san-bay-tan-son-nhat/
- Noi Bai pickup reorganization, 2026-08-03: https://english.vov.vn/en/travel/noi-bai-airport-opens-dedicated-immigration-lanes-reorganizes-pick-up-zones-post1320744.vov
- Noi Bai bus/taxi information: https://www.noibaiairport.vn/vi/phuong-tien-van-chuyen-cong-cong-nid1.html
- Da Nang international pickup lanes: https://www.grab.com/global/airport-rides/da-nang-international-airport/
- General airport ride guidance: https://www.grab.com/global/airport-rides/

Removed the duplicate Da Nang T2 6/7 marker; Da Nang/Hoi An now use the same Lane 1/2 reference. Updated the older Noi Bai T1 Lane 3 text to the Hall E/P2 guidance and T2 P1/P7 overflow note. Existing coordinates are explicitly approximate orientation points, not newly surveyed pickup lanes. No fare or timetable is promised as fixed.

## Verification

- `node tests/traveller-tools.test.cjs`
- Existing rating scope, list layout, geography, classification and optional-feedback regressions.
- DOM integration exercised opening/closing, escaped review body, safe photo URLs, detail navigation, network error/retry, all nine guide selections, and stale boundary response after a city switch.
- Source and output polygon topology validated with Shapely. Output feature IDs unique, source-era labels present, and travel-city centres contained in the applicable province.
- `node scripts/build-pages.mjs`

No database schema migration, new tracking service, polling, or paid GIS service was added. DOM checks do not substitute for visual testing against a live Google Maps browser session.
