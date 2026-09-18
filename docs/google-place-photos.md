# Business photo integration

Implemented 2026-09-18. Uses the existing Maps JavaScript PlacesService, with no new key or permission changes.

## Display

- A business detail can display up to three live Google Place Photos, separately from member uploads. Mobile requests begin only after expanding the detail sheet; desktop requests begin on selecting the business.
- Lists, markers, hover cards, and initial page load do not fetch photos for every business. New registered businesses use the same lookup without asking the member to provide photo links.
- Clicking a photo opens the matched business in Google Maps. Each photo retains the supplied author attribution and links; result-level attribution is also shown.
- If Google has no photos, the branch cannot be verified, or the API fails, the detail remains usable and includes a Google Maps link. Missing images are never replaced with generic stock photos or another branch's pictures.
- Public data/rights notice: `/guide/photos.html`.

## Matching and requests

1. Match registered name, address and coordinates. Reject weak/category-only name matches, conflicting house numbers/streets, distant pins, missing coordinates and multiple plausible candidates. Incomplete addresses require an exact name and a pin within 100 m.
2. For a new local lookup, request only `place_id`, `name`, `formatted_address`, `geometry` via `findPlaceFromQuery`; no mass prefetch or Nearby/Text Search.
3. Request those fields plus `photos` using `getDetails` and revalidate the identity. Generate a maximum of three 480 × 360 photo URLs.
4. A previously confirmed Place ID can skip the search, but each new detail session refreshes and revalidates the returned details. A changed registration fingerprint invalidates the cached ID. Invalid/removed IDs are discarded.
5. While the same detail is open, preserve the current gallery DOM across renders rather than repeat the request. Late responses cannot populate another selection or request photos after closure. API failures retry only on user action/reopening.

Only a confirmed Place ID and the fingerprint of the app's own registration are saved locally. Google photos, photo references/URLs, returned names/addresses and credits are not persisted to localStorage, Supabase, bundled assets or a service-worker cache. Member `photo_urls` are unchanged.

Matching is intentionally conservative. Korean-only aliases, imprecise pins, incomplete addresses and spelling errors can produce a fallback instead of a gallery. This is an on-demand integration, not a claim that three photos have been individually obtained/verified for every record.

## Cost and verification

Google Places/Photo usage is subject to the project's enabled APIs, restrictions, quotas and billing. One uncached opened detail makes at most one find request, one details request, and three photo requests. A cached Place ID skips the find request. No reviews, ratings, phone or other premium fields are requested for the gallery. No free-usage guarantee is made.

`tests/place-photos.test.cjs` exercises mobile and desktop visibility, branch rejection, ambiguity, empty results, attribution sanitization, preservation of member uploads, persistence boundaries, deduplication, stale requests, image failures, API errors, recovery, invalid IDs and denied localStorage. Existing nickname and booking inquiry/history tests also pass. Production browser rendering/live photo response verification was limited by a cloud-browser CDP connection timeout during this change; deployment assets are independently verified over HTTP.

Official references:

- https://developers.google.com/maps/documentation/javascript/legacy/places#place_photos
- https://developers.google.com/maps/documentation/javascript/legacy/places#find_place_from_query
- https://developers.google.com/maps/documentation/javascript/policies
- https://developers.google.com/maps/documentation/places/web-service/policies
