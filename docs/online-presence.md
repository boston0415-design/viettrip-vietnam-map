# Online visitor counter — 2026-09-18

The first statistic is now `실시간 접속`, immediately before cumulative visits.
It counts distinct random browser keys connected to the `viettrip-online-v1`
Supabase Presence channel, including the current browser. Several connected tabs
sharing browser storage count once. Separate devices/profiles count separately;
blocking browser storage may prevent cross-tab deduplication. This is a connected
browser count, not an authenticated member count or a verified count of people.

No table, migration, scheduled database writes, Google Maps requests, personal
details or registration-owner credentials are involved. The only presence payload
is `{online:true}`. Preview/local hosts are excluded. Existing cumulative visits
keep their independent 30-minute deduplication rule.

The counter becomes `—` on subscription/heartbeat failures and retries with bounded
backoff. Page exit, offline events and back/forward cache restoration are handled.
Abrupt network loss is removed when Realtime detects the lost connection; it is
not guaranteed to disappear instantly. A hidden tab still counts while connected.
Previously opened copies of the site must refresh to participate.

PC uses the existing statistics strip. Below 600 px, the four statistics form two
columns: online/visits above places/reviews. Other compact layouts may wrap.

## Dependency and sources

- [Supabase Presence guide](https://supabase.com/docs/guides/realtime/presence)
- [Realtime JS source and usage](https://github.com/supabase/supabase-js/tree/master/packages/core/realtime-js)

The browser bundle contains only `@supabase/realtime-js` 2.116.0 and its dependencies,
served from this site. Exact dependency versions and integrity hashes are recorded
in `scripts/presence-sdk/package-lock.json`; license notices are in
`assets/licenses/realtime-NOTICE.txt`. Regenerate using `npm ci --prefix
scripts/presence-sdk --ignore-scripts` then `npm run --prefix scripts/presence-sdk build`.
The normal Pages build copies the committed bundle and does not install packages.

## Verification

- `tests/online-presence.test.cjs`: DOM placement, lifecycle, deduplication, failures,
  stale callback protection, heartbeat recovery, storage fallback and preview exclusion.
- `tests/online-presence-sdk.test.cjs`: committed browser bundle against a deterministic
  Phoenix protocol fixture; join, tracking, same-browser tabs and leave synchronization.
- `tests/community-stats-unit.test.cjs`: existing totals and visit rules remain unchanged.
- `node tests/online-presence-live.cjs`: optional real-service check on a unique,
  disposable Presence topic; it never changes production counts or database rows.

The current execution environment timed out before its WebSocket opened, so the
live-service check could not be completed here. The browser inspection connection
also timed out; real device layout and live server counts remain unverified.
