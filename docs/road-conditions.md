# Road conditions

Traffic uses Google Maps JavaScript `TrafficLayer`, including Google's supported
coverage and refresh cadence. It is opt-in; no extra polling of Google traffic is
performed. Rain animation does not imply flooding.

Flood and construction overlays use `assets/data/road-conditions.json`. This is a
reviewed publication file, not an automatic incident feed. No current incidents
were independently verified for the initial release, so it starts empty. Empty
coverage is explicitly distinguished from a safe road or a failed download.

## Member reporting and publication

1. Open **도로 상황 → 침수·공사 제보** and choose a road on the map.
2. Supply a city, road name, observed time (Vietnam time), description and optional
   HTTPS source. Copy the report and post it in the linked Naver cafe, adding photos.
   Copying is not submission; the UI states this. No report is sent automatically.
3. A maintainer verifies the actual road coordinates and current situation against
   the dated official notice or member post. Record the source permalink and review.
4. Add a record to the publication file, validate/build, review the map and deploy.
   Retraction removes the record from this file; this never deletes a member post.

No Google app incident scraping, claims of full coverage, unauthenticated public
publishing, production schema changes, or writes to places/reviews are involved.
Reports and draft coordinates stay in memory until the user explicitly copies
them. Only the three layer preferences are stored locally.

## Record contract

Top level: `version: 1`, ISO `updatedAt`, and `incidents` (maximum 200).
Each record requires:

- `id`: stable lowercase letters/numbers/hyphens; `kind`: `flood` or `construction`.
- `city`: an existing `CITY_DATA` key; `title` (up to 120 chars) and `description`
  (up to 700 chars). Explain direction/affected segment; do not promise safe passage.
- `geometry`: GeoJSON Point, LineString (2–100 points), or Polygon (one closed ring,
  4–100 points). Coordinates use `[longitude, latitude]` and must lie within the
  supported Vietnam map envelope. Do not infer a large flooded polygon from one pin.
- `observedAt`: when the situation was observed or the official notice took effect.
- `verifiedAt`: when a maintainer verified the source; not a fetch timestamp.
- `expiresAt`: mandatory. Flooding expires within 6 hours of observation;
  construction within 7 days of verification, or the announced end if sooner.
- `source`: `{type: "official" | "community", name, url}` with a real HTTPS permalink.
- `reviewedBy`: a non-secret maintainer label. Never include login keys or personal data.

Times must include `Z` or an explicit UTC offset. Future events are not displayed.
Expired events are hidden, including after a failed refresh. Do not extend expiry
without fresh verification. The client checks every minute while visible and
fetches the publication file at most every five minutes, plus an explicit refresh.
Invalid feeds keep the last valid in-memory feed and show an error. They do not
replace it with an authoritative empty result. The build rejects malformed data.

## Validation

- `node scripts/validate-road-conditions.mjs`
- `node tests/road-conditions.test.cjs` (jsdom required)
- `node scripts/test-map-ux.cjs` checks browser flows at 320/390/768/1440 px with
  local-only fixtures. Fixture incidents are never included in the published file.

Official references checked 2026-10-02:
- https://developers.google.com/maps/documentation/javascript/trafficlayer
- https://developers.google.com/flood-forecasting

Google Flood Forecasting needs separate access and describes riverine forecasts;
it is not connected here and is not presented as live urban street inundation.
