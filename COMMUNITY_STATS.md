# Community statistics

The header displays cumulative visit sessions, saved places and reviews from the shared database. Values use exact REST counts and do not depend on map filters. Counts refresh when the page is loaded. A failed request displays a dash, never a fabricated zero.

Visits start on 2026-09-17, without backfilling an invented history. Only the production hostname records visits. A random sessionStorage UUID deduplicates reloads in a tab. This is a visit count, not unique people or verified cafe members. New tabs, cleared storage, and automated clients can affect totals; it is not fraud-resistant analytics. No IP addresses or device fingerprints are collected by this feature. If session storage is blocked, recording is skipped.

Supabase migration: `add_public_visit_counter`. The new `site_visits` table has RLS enabled. Anonymous clients can insert only a random UUID and read/count only server-generated timestamps. They cannot read UUIDs, update, delete, set timestamps or modify totals. No existing tables or permissions were changed. SQL verification was rolled back, leaving no test visits.

## Verification

- `node tests/community-stats.test.cjs` (requires Playwright Chromium)
- `node tests/rating-scope.test.cjs`
- `node tests/classification-scopes.test.cjs`
- `node tests/geography-regressions.test.cjs`
- `node scripts/build-pages.mjs`

## Existing database advisories

The Supabase advisor reported pre-existing `places_public` security-definer view and anonymous-callable admin/device RPCs. Their authorization was outside this UI change and has not been altered or certified here. See https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view and https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .
