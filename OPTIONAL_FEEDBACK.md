# Independent ratings and written reviews

Migration `separate_optional_ratings_and_reviews` allows nullable review ratings. An entry requires a rating or nonblank written review. The existing device/place unique index remains in force; the existing RPC now uses atomic INSERT ON CONFLICT so concurrent requests cannot create duplicate rows. Empty submitted components preserve existing ones. A written review requires a nickname; a rating alone does not. Photos accompany written reviews.

Average scores count only actual ratings. Written-review totals exclude rating-only entries. The public places view and server statistics ignore the initial registration rating when that same registering device has submitted a review rating, avoiding a duplicate owner vote.

Identity remains the existing browser-stored device token. This is not verified person-level identity: clearing browser storage or changing browser/device can bypass it. No account authentication was introduced. Existing RPC privilege model was retained, not expanded.

SQL transaction tests cover rating then review, review-only averages, updating without duplication, owner ratings, component preservation and empty rejection. Test records are rolled back. Client test: `node tests/optional-feedback.test.cjs`.
