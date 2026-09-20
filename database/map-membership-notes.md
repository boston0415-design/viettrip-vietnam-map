# Map contribution membership

Grades are independent of Naver Cafe ranks and benefits. All map features remain
available at every grade. Thresholds are cumulative valid contributions:

| Grade | Contributions |
|---|---:|
| 훈련병 | 0 |
| 이등병 | 3 |
| 일병 | 10 |
| 상병 | 25 |
| 병장 | 60 |
| 대장 | 150 |

## Identity and access

The existing application authorizes contributions with a random UUID v4 device
credential. Membership retains this boundary; it does not create Supabase Auth
users or claim to verify someone's real identity or Cafe membership.

`map_private.devices` binds credentials to a stable member UUID. Private RPC
actions require the full device credential; the public SHA-256 digest and the
nickname cannot authenticate anyone. Private membership responses return linked
device credentials only to their account, so existing owner/review RPC checks keep
working on connected devices. The frontend keeps linked credentials in memory,
never renders them and never adds them to the shared public data cache.

Link and recovery codes use 24 random bytes (192 bits), stored only as SHA-256
digests. Link codes expire after 10 minutes and are consumed once. Recovery codes
remain valid until replaced. Linking requires proof of both accounts and explicit
merge consent. No contributions are deleted during a merge. Without a linked
device or recovery code, a nickname alone cannot recover an account. This is a
bearer-credential account, not an email/password login. Codes must remain private.

Every new table is in a non-exposed schema, has RLS enabled and denies all direct
anon/authenticated table access. No row policies is intentional (default deny).
The public API is SECURITY INVOKER; the private implementation uses a fixed empty
search_path and narrowly checks capabilities/admin proof before private actions.
Its definer rights are needed to read the private credential registry. Internal
functions are not generally executable. Public badge requests return only public
author hashes, a stable author ID, contribution totals and grade.

## Counting and moderation

Counts are derived from current database rows, never submitted by the browser.
Registrations require a name/address/location and a UUID v4 member credential.
Duplicate normalized names at coordinates rounded to four decimals count once.
Review text must contain at least 10 trimmed characters; repeated identical text
and multiple linked-device reviews of the same place count once. Ratings, strong
recommendations, standalone photos, visits, clicks and shares earn no credit.
Original photos may accompany a review but do not multiply its credit.

Address/hours/closure/other correction proposals appear in the admin queue.
Only approved proposals count, once per member/place/field. Admins verify and edit
the place using existing controls before approving; approval itself does not edit
the place. They can reject or revoke approval. Admins can also exclude individual
registrations/reviews from credit without deleting the content. The checked
`exclude` action accepts `excluded:false` to restore mistakenly excluded credit.

Account inactivity does not lower grades. Deletion or moderation may lower the
current contribution count. Server-originated deleted snapshots are not uploaded
again as new contributions. Grade is a participation indicator, not a guarantee
that content is accurate. Human moderation remains necessary for fabricated visits.

## Validation

`tests/map-membership.sql` runs inside a rolled-back transaction and tests old
contributions, low/high ratings, updates, duplicate cross-device feedback, link
codes, recovery, approved/revoked corrections, thresholds, deletion and anonymous
privilege restrictions. No synthetic public data is left behind.

`tests/map-membership.test.cjs` exercises 360/768/1440 DOM configurations, grade
progress, XSS escaping, credential visibility, merge consent, linked owner and
review editing, correction forms and failures. Existing search, review, panel
history and touch/mouse sheet suites cover affected integration paths.

CLI created the migration filename. Local schema pull is unavailable because
there is no local Postgres instance; the checked SQL is verified against the
connected project through transactional tests instead.
