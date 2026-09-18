# Travel guide

Live route: `/guide/`. First release: 2026-09-18.

The map remains the root page and the installed application's start URL. The guide is an independent static page; it loads no Google Maps or database client. It includes 13 guides, 6 topics, text search, browser-local bookmarks, editable inquiry templates, phrase copying, source links and navigation back to the map.

## Content

Edit `assets/js/travel-guide-data.js` for guide copy, source URLs and individual source check dates. A source check date does not certify current fares, opening hours, pickup positions or member eligibility. Do not add unconfirmed prices or contacts. Contact actions currently lead to the existing Naver cafe; copying an inquiry does not send it.

Local airport/river guidance is scoped to HCMC; the tour bus guide supports HCMC and Hanoi. Other guides are general. For other selected cities, the guide shows eligible general content and passes that city into map links. Saved guides from all cities remain discoverable; opening a city-specific saved guide selects its applicable city.

No automated private cafe scraping, review duplication, reservation processing, external affiliate account, analytics service or new database table is introduced. Existing map reviews and benefit flags remain the source of truth.

## Map navigation

The isolated `guide-map-link.js` processes only requests with `from=guide`. It validates `city`, `category`, airport `group`, `benefit=1`, and `panel=transport|reviews` against known values. It joins the map's existing loading promise, then reuses existing city, category and benefit controls. A category and benefit must stay intersected, particularly `category=stay&benefit=1`.

Ordinary map visits receive only guide links, without resetting state. Interaction during loading cancels automatic movement. Hidden-place/favorite records are never cleared; the personal *view* becomes All for explicit guide links. The contextual guide link in the map filter follows city/category selection.

## Persistence and back navigation

Only saved guide IDs use `viettrip_saved_guides_v1`. They are local bookmarks, not cached offline articles and not account-synced. Storage failure preserves session choices and displays an explanation. Article URLs use `read=<id>`; browser Back/Escape/close return to the guide list, and Forward can restore the article. Other map history code is unchanged.

## Build and checks

`node scripts/build-pages.mjs` includes the `guide` folder. Tests require jsdom via `JSDOM_PATH` or an installed `jsdom` package:

```
node tests/travel-guide.test.cjs
node tests/guide-map-link.test.cjs
node tests/home-screen.test.cjs
node tests/panel-history.test.cjs
node tests/tour-boarding.test.cjs
```

Tests cover search, bookmarks and failures, cities, map link contracts, actual category/benefit handlers, cancellation/retry, copy, safe text, native-history transitions and production assets. Native dialogs and Maps geometry/network are emulated. The connected browser timed out during this release, so actual desktop/mobile visual rendering and native-device interactions have not been verified.
