# Member accounts

Email/password authentication uses the pinned Supabase JS 2.117.2 client. Passwords
are handled by Supabase Auth, never by the map database. Email confirmation stays
enabled. Production Auth must allow the site's root URL as a redirect and have a
working custom SMTP provider for public signup and password recovery.

`map_private.accounts` binds a verified Auth user to the existing contribution
membership. The server checks `auth.uid()`, confirmed email, and the active
`session_id` in `auth.sessions`. User metadata only supplies a display nickname;
it never grants permissions. The account's device credential and linked credentials
remain in memory, never in the DOM or public membership data. Every existing device
write path also checks the account binding and current session. Retaining a device
credential does not bypass logout or authorize another account's records.

Login creates a separate identity. Importing guest activity requires an explicit
checkbox and the existing browser's full random credential. It only moves private
membership associations; public place/review IDs, text, photos and timestamps are
not rewritten. Another account cannot be imported. After import, the browser's
guest credential is rotated locally and the imported one requires account login.
Account-bound recovery/link codes cannot grant access outside email login.

Points reuse the established contribution rules: one accepted contribution is one
point. Counts are derived on the server. Editing does not accumulate points;
deletion and restoration recalculate the count. My Reviews includes rating-only
records and pagination, with explicit review IDs for editing linked-device records.

Deleting one's review preserves an original private snapshot before removing it
from public results. Undo restores the exact record and refuses to overwrite a new
review. Only the same account can delete or restore it. The migration itself does
not delete, recreate, reset, or rewrite any existing production records.

The `Member account database` workflow uses a fresh PostgreSQL service and synthetic
Auth fixtures; never run `tests/member-account-bootstrap.sql` or
`tests/member-account.sql` against production. It checks cross-account denial,
revoked sessions, legacy credential bypass, direct insert RLS, guest claims,
original content, and derived points. DOM tests cover login races, account changes,
late responses, exact review editing, cancel, deletion and undo. Browser regression
uses mocked Auth and no real accounts at 320/390/768/1440px.
