# UI changes

The user requires every UI change and optimization to apply to both desktop and mobile. Prefer shared behavior, account for each layout, and verify the affected flow in both modes. Report device or browser verification limits accurately.

# Data safety

UI changes must never delete, recreate or reset production reviews or places. Inspect production with read-only queries only. Do not run test fixtures or migrations against production while adjusting UI. A failed reviews API response must not replace the last good cache with an empty list or trigger a legacy re-upload. Do not invent missing review text or restore another author's record. Test review save targeting, preservation and close-without-save behavior.

# Sheet interaction

On the map's list, detail and lower panels, vertical drags starting on titles, business names, cards, photos or non-editing buttons move the sheet first when compact. Do not revert to grip-only resizing or small-container-only scrolling. Distinguish taps from drags; preserve form typing, horizontal rails and pinch zoom.
