# Business registrant nickname — 2026-09-18

New registrations require a trimmed nickname of 1–30 characters. It is stored as
`places.registrant_nickname`, returned through `places_public`, kept in the local
place cache as `registrantNickname`, and escaped when displayed in business details.
The input explicitly tells the member that the nickname will be public.

Existing rows remain null. Older cached clients and pending offline writes may
still insert null; the new UI requires the nickname before photos or database writes.
Do not backfill a registrant from a review, current operator, device name or admin.
Nicknames do not verify Naver membership and are never used for authorization.

The current owner/admin update RPCs do not accept this field. Editing a place shows
the original nickname read-only, preserving attribution. Existing places without a
nickname remain editable. The name is shown in the expanded mobile/desktop detail
body so the collapsed mobile summary does not grow.

Apply `supabase/migrations/20260918081258_add_place_registrant_nickname.sql` before
deploying the new UI. It adds a nullable column and validation constraint, grants
read access only for that column, and appends it to the existing security-invoker
view. No existing records, review rules, write policies or owner/admin functions
are rewritten. The view's owner-rating deduplication expression is preserved.

Verification: focused registration validation/save/public-read tests, legacy edits,
escaped nickname rendering, unchanged owner/admin behavior, detail panel and booking
regressions. Database tests run as `anon` inside a rolled-back transaction so test
places never become visible to members. Check RLS/grants and owner/admin function
hashes after migration; compare security advisors against the existing baseline.

Relevant Supabase documentation consulted:
- https://supabase.com/docs/guides/database/tables
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/changelog.md
